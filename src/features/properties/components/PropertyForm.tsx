import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useCreatePropertyMutation, useGetPropertyQuery, useUpdatePropertyMutation, PropertyCreate, type PropertyResponse } from '@/features/properties/api/propertiesApi'
import { useToast } from '@/hooks/use-toast'
import { useGetUsersQuery } from '@/features/users/api/usersApi'
import { useUserRole } from '@/hooks/useUserRole'
import { useGetAmenitiesQuery } from '@/features/core/api/amenitiesApi'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { FormRootError } from '@/components/ui/form-root-error'
import { Form } from '@/components/ui/form'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { useDebounce } from '@/hooks/useDebounce'
import { propertyFormSchema, type PropertyFormValues } from '@/features/properties/validations'
import type { PropertyStatus } from '@/types/pm'
import PropertyBasicInfo from './PropertyBasicInfo'
import PropertyOwnerSection from './PropertyOwnerSection'
import PropertyAmenitiesSection from './PropertyAmenitiesSection'

const PropertyForm = ({ id, onSuccess }: { id?: number; onSuccess?: (id: number) => void }) => {
  const { toast } = useToast()
  const [images, setImages] = useState<string[]>([])
  const [primaryImage, setPrimaryImage] = useState<string | null>(null)
  const { user: me, role } = useUserRole()
  const [ownerMode, setOwnerMode] = useState<'search' | 'id'>('search')
  const [ownerSearch, setOwnerSearch] = useState('')
  const dq = useDebounce(ownerSearch, 300)
  const users = useGetUsersQuery(
    { limit: 20, q: dq || undefined, ...(role === 'agent' && me?.agent_id ? { agent_id: me.agent_id } : {}) },
    { skip: ownerMode !== 'search' }
  )
  const amenities = useGetAmenitiesQuery()
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: '', description: '', property_type: 'apartment',
      purpose: 'rent', status: 'available', base_price: undefined,
      city: '', locality: '', address: '', latitude: undefined, longitude: undefined,
      owner_id: undefined, is_available: true, available_from: '', amenity_ids: [],
      pincode: '', area_sqft: undefined, bedrooms: 0, bathrooms: 0, balconies: 0,
      parking_spaces: 0, floor_number: 0, total_floors: 1, age_of_property: 0,
      max_occupancy: 1, minimum_stay_days: 1, features: [], owner_name: '', owner_contact: '',
    }
  })
  const { reset } = form
  const isEdit = !!id
  const { data, isLoading, isError, error, refetch } = useGetPropertyQuery(id!, { skip: !isEdit })
  const [createProperty, createState] = useCreatePropertyMutation()
  const [updateProperty, updateState] = useUpdatePropertyMutation()

  useEffect(() => {
    if (data) {
      const extras = data as PropertyResponse & { is_available?: boolean; available_from?: string; amenities?: Array<{ id: number }>; thumbnail_url?: string }
      const amenityIds = Array.isArray(extras.amenities) ? extras.amenities.map((a) => Number(a.id)).filter((v) => !Number.isNaN(v)) : []
      reset({
        title: data.title,
        description: data.description ?? '',
        property_type: data.property_type,
        purpose: data.purpose,
        base_price: data.base_price,
        city: data.city ?? '',
        locality: data.locality ?? '',
        pincode: data.pincode ?? '',
        area_sqft: data.area_sqft,
        bedrooms: data.bedrooms ?? 0,
        bathrooms: data.bathrooms ?? 0,
        balconies: data.balconies ?? 0,
        parking_spaces: data.parking_spaces ?? 0,
        floor_number: data.floor_number ?? 0,
        total_floors: data.total_floors ?? 1,
        age_of_property: data.age_of_property ?? 0,
        max_occupancy: data.max_occupancy ?? 1,
        minimum_stay_days: data.minimum_stay_days ?? 1,
        status: data.status,
        owner_id: data.owner_id,
        is_available: extras.is_available ?? data.status === 'available',
        available_from: extras.available_from ?? '',
        amenity_ids: amenityIds,
        features: data.features || [],
        owner_name: data.owner_name ?? '',
        owner_contact: data.owner_contact ?? '',
        latitude: data.latitude,
        longitude: data.longitude,
        address: '',
      })
      setImages((data.images || []).map((image) => image.image_url))
      setPrimaryImage(extras.thumbnail_url ?? data.main_image_url ?? null)
    }
  }, [data, reset])

  const onSubmit = async (values: PropertyFormValues) => {
    try {
      const payload: PropertyCreate = {
        title: values.title,
        description: values.description,
        property_type: values.property_type,
        purpose: values.purpose,
        base_price: values.base_price,
        latitude: values.latitude,
        longitude: values.longitude,
        city: values.city,
        locality: values.locality,
        pincode: values.pincode,
        area_sqft: values.area_sqft,
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        balconies: values.balconies,
        parking_spaces: values.parking_spaces,
        floor_number: values.floor_number,
        total_floors: values.total_floors,
        age_of_property: values.age_of_property,
        max_occupancy: values.max_occupancy,
        minimum_stay_days: values.minimum_stay_days,
        amenity_ids: values.amenity_ids || [],
        features: values.features || [],
        main_image_url: primaryImage || images[0] || '',
        owner_name: values.owner_name,
        owner_contact: values.owner_contact,
      }
      if (isEdit && id) {
        const res = await updateProperty({
          id,
          data: {
            ...payload,
            status: (values.status as PropertyStatus | undefined) || undefined,
            is_available: values.is_available,
          },
        }).unwrap()
        toast({ title: 'Updated', description: 'Property updated successfully' })
        onSuccess?.(res.id)
      } else {
        const ownerIdParam = (role === 'admin' || role === 'agent') && values.owner_id ? values.owner_id : undefined
        const res = await createProperty({ data: payload, ownerId: ownerIdParam }).unwrap()
        toast({ title: 'Created', description: 'Property created successfully' })
        onSuccess?.(res.id)
      }
    } catch (err: unknown) {
      applyServerValidation(err, form.setError)
      toast({ title: 'Save failed', description: getErrorMessage(err, 'Please check inputs'), variant: 'destructive' })
    }
  }

  if (isEdit && isLoading) {
    return <LoadingState type="card" rows={8} />
  }

  if (isEdit && isError) {
    return (
      <ErrorState
        title="Failed to load property"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{isEdit ? 'Edit Property' : 'Create Property'}</h1>
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><FormRootError form={form} /></div>
              <PropertyBasicInfo form={form} images={images} setImages={setImages} primaryImage={primaryImage} setPrimaryImage={setPrimaryImage} />
              <PropertyOwnerSection form={form} ownerMode={ownerMode} setOwnerMode={setOwnerMode} ownerSearch={ownerSearch} setOwnerSearch={setOwnerSearch} users={users} role={role} />
              <PropertyAmenitiesSection form={form} amenities={amenities} />
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="submit" disabled={createState.isLoading || updateState.isLoading || isLoading}>
                  {isEdit ? (updateState.isLoading ? 'Saving…' : 'Save Changes') : createState.isLoading ? 'Creating…' : 'Create Property'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default PropertyForm

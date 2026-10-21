import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useCreatePropertyMutation, useGetPropertyQuery, useUpdatePropertyMutation, type PropertyCreate, type PropertyUpdate } from '@/features/properties/api/propertiesApi'
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
import { PageHeader } from '@/components/ui/page-header'
import FadeContent from '@/components/reactbits/FadeContent'
import { useScopedDebounce } from '@/hooks/useScopedDebounce'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { propertyFormSchema, type PropertyFormValues } from '@/features/properties/validations'
import { isPropertyStatus } from '@/features/properties/constants'
import PropertyBasicInfo from './PropertyBasicInfo'
import PropertyOwnerSection from './PropertyOwnerSection'
import PropertyAmenitiesSection from './PropertyAmenitiesSection'

const PropertyForm = ({ id, onSuccess }: { id?: number; onSuccess?: (id: number) => void }) => {
  const { toast } = useToast()
  const [images, setImages] = useState<string[]>([])
  const [primaryImage, setPrimaryImage] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)
  const initialMedia = useRef<{ images: string[]; primary: string | null }>({ images: [], primary: null })
  const hydratedPropertyId = useRef<number | null>(null)
  const mounted = useRef(true)
  const { user: me, role } = useUserRole()
  const [ownerMode, setOwnerMode] = useState<'search' | 'id'>('search')
  const [ownerSearch, setOwnerSearch] = useState('')
  const dq = useScopedDebounce(ownerSearch, me?.supabase_user_id, 300)
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
      monthly_rent: undefined, daily_rate: undefined, kitchen_type: undefined,
      ventilation_type: undefined, furnishing_level: undefined, windows_count: undefined,
      ventilation_shafts: undefined, setup_cost: undefined, other_charges: undefined,
      other_charges_description: '',
    }
  })
  const { reset } = form
  const isEdit = !!id
  const { currentData: data, isLoading, isFetching, isError, error, refetch } = useGetPropertyQuery(id!, { skip: !isEdit })
  const [createProperty, createState] = useCreatePropertyMutation()
  const [updateProperty, updateState] = useUpdatePropertyMutation()
  const saving = createState.isLoading || updateState.isLoading
  const mediaDirty = images.join('\u0000') !== initialMedia.current.images.join('\u0000') || primaryImage !== initialMedia.current.primary
  const allowSavedNavigation = useUnsavedChanges(form.formState.isDirty || mediaDirty)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (data && hydratedPropertyId.current !== data.id) {
      // `amenities[].id` is the amenity id (what `amenity_ids` takes), not a join-row id.
      const amenityIds = (data.amenities ?? []).map((amenity) => amenity.id)
      reset({
        title: data.title,
        description: data.description ?? '',
        property_type: data.property_type,
        purpose: data.purpose,
        base_price: data.base_price,
        city: data.city ?? '',
        locality: data.locality ?? '',
        pincode: data.pincode ?? '',
        area_sqft: data.area_sqft ?? undefined,
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
        is_available: data.is_available,
        // A date, YYYY-MM-DD, which is what the date input takes.
        available_from: data.available_from ?? '',
        amenity_ids: amenityIds,
        features: data.features ?? [],
        owner_name: data.owner_name ?? '',
        owner_contact: data.owner_contact ?? '',
        monthly_rent: data.monthly_rent ?? undefined,
        daily_rate: data.daily_rate ?? undefined,
        kitchen_type: data.kitchen_type ?? undefined,
        ventilation_type: data.ventilation_type ?? undefined,
        furnishing_level: data.furnishing_level ?? undefined,
        windows_count: data.windows_count ?? undefined,
        ventilation_shafts: data.ventilation_shafts ?? undefined,
        setup_cost: data.setup_cost ?? undefined,
        other_charges: data.other_charges ?? undefined,
        other_charges_description: data.other_charges_description ?? '',
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        address: '',
      })
      // Floor plans are returned in `floor_plans`, not in `images`. The filter only guards a stale row.
      const loadedImages = (data.images ?? [])
        .filter((image) => image.image_category !== 'floor_plan')
        .map((image) => image.image_url)
      const loadedPrimary = data.main_image_url ?? null
      if (loadedPrimary && !loadedImages.includes(loadedPrimary)) loadedImages.unshift(loadedPrimary)
      initialMedia.current = { images: loadedImages, primary: loadedPrimary }
      setImages(loadedImages)
      setPrimaryImage(loadedPrimary)
      hydratedPropertyId.current = data.id
    }
  }, [data, reset])

  const onSubmit = async (values: PropertyFormValues) => {
    if (submitting.current || imageUploading) return
    submitting.current = true
    if (formRef.current) formRef.current.inert = true
    const imageUrls = primaryImage && images.includes(primaryImage)
      ? [primaryImage, ...images.filter((image) => image !== primaryImage)]
      : [...images]
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
        main_image_url: imageUrls[0],
        image_urls: imageUrls,
        owner_name: values.owner_name,
        owner_contact: values.owner_contact,
        monthly_rent: values.monthly_rent,
        daily_rate: values.daily_rate,
        kitchen_type: values.kitchen_type,
        ventilation_type: values.ventilation_type,
        furnishing_level: values.furnishing_level,
        windows_count: values.windows_count,
        ventilation_shafts: values.ventilation_shafts,
        setup_cost: values.setup_cost,
        other_charges: values.other_charges,
        other_charges_description: values.other_charges_description,
        // A date, YYYY-MM-DD (not a datetime).
        available_from: values.available_from || undefined,
      }
      const status = values.status && isPropertyStatus(values.status) ? values.status : undefined
      if (isEdit && id) {
        // PUT is PATCH-style. A cleared optional field is sent as null so it clears the stored value.
        // `monthly_rent` is not cleared here: a rent listing needs it, and the schema above requires it.
        const clear = <T,>(value: T | undefined | '') => (value === undefined || value === '' ? null : value)
        const update: PropertyUpdate = {
          ...payload,
          description: clear(values.description),
          latitude: clear(values.latitude),
          longitude: clear(values.longitude),
          pincode: clear(values.pincode),
          owner_name: clear(values.owner_name),
          owner_contact: clear(values.owner_contact),
          daily_rate: clear(values.daily_rate),
          kitchen_type: clear(values.kitchen_type),
          ventilation_type: clear(values.ventilation_type),
          furnishing_level: clear(values.furnishing_level),
          windows_count: clear(values.windows_count),
          ventilation_shafts: clear(values.ventilation_shafts),
          setup_cost: clear(values.setup_cost),
          other_charges: clear(values.other_charges),
          other_charges_description: clear(values.other_charges_description),
          available_from: clear(values.available_from),
          status,
          is_available: values.is_available,
        }
        const res = await updateProperty({ id, data: update }).unwrap()
        if (!mounted.current) return
        reset(values)
        initialMedia.current = { images: [...images], primary: primaryImage }
        toast({ title: 'Updated', description: 'Property updated successfully' })
        allowSavedNavigation()
        onSuccess?.(res.id)
      } else {
        const ownerIdParam = (role === 'admin' || role === 'agent') && values.owner_id ? values.owner_id : undefined
        const res = await createProperty({ data: { ...payload, status, is_available: values.is_available }, ownerId: ownerIdParam }).unwrap()
        if (!mounted.current) return
        reset(values)
        initialMedia.current = { images: [...images], primary: primaryImage }
        toast({ title: 'Created', description: 'Property created successfully' })
        allowSavedNavigation()
        onSuccess?.(res.id)
      }
    } catch (err: unknown) {
      if (!mounted.current) return
      applyServerValidation(err, form.setError)
      toast({ title: 'Save failed', description: getErrorMessage(err, 'Please check inputs'), variant: 'destructive' })
    } finally {
      submitting.current = false
      if (mounted.current && formRef.current) formRef.current.inert = false
    }
  }

  if (isEdit && (isLoading || (isFetching && !data))) {
    return <LoadingState type="card" rows={8} />
  }

  if (isEdit && isError && !data) {
    return (
      <ErrorState
        title="Failed to load property"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {saving && <p role="status" className="text-sm text-muted-foreground">{isEdit ? 'Saving property…' : 'Creating property…'}</p>}
      {isFetching && data && <p role="status" className="text-sm text-muted-foreground">Checking for property updates…</p>}
      {error && data && <p role="alert" className="text-sm text-destructive">Could not refresh this property. Your edits are still here. <Button variant="link" size="sm" onClick={() => void refetch()}>Retry</Button></p>}
      <PageHeader
        title={isEdit ? 'Edit Property' : 'Create Property'}
        description={
          isEdit
            ? 'Update property information and details'
            : 'Add a new property to the platform'
        }
        icon={Building2}
      />
      <FadeContent container="#main-content" threshold={0} duration={600}>
        <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form ref={formRef} onSubmit={(e) => {
              if (submitting.current || imageUploading) { e.preventDefault(); return }
              void form.handleSubmit(onSubmit)(e)
            }} className="grid gap-4 md:grid-cols-2" aria-busy={saving}>
              <fieldset disabled={saving} className="contents">
              <div className="md:col-span-2"><FormRootError form={form} /></div>
              <PropertyBasicInfo form={form} images={images} setImages={setImages} primaryImage={primaryImage} setPrimaryImage={setPrimaryImage} onImageUploadingChange={setImageUploading} disabled={saving} />
              <PropertyOwnerSection form={form} ownerMode={ownerMode} setOwnerMode={setOwnerMode} ownerSearch={ownerSearch} setOwnerSearch={setOwnerSearch} users={users} role={role} disabled={saving} />
              <PropertyAmenitiesSection
                form={form}
                amenities={amenities.data}
                isLoading={amenities.isLoading}
                error={amenities.error}
                onRetry={() => void amenities.refetch()}
                disabled={saving}
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="submit" disabled={saving || isLoading || imageUploading}>
                  {isEdit ? (updateState.isLoading ? 'Saving…' : 'Save Changes') : createState.isLoading ? 'Creating…' : 'Create Property'}
                </Button>
              </div>
              </fieldset>
            </form>
          </Form>
        </CardContent>
        </Card>
      </FadeContent>
    </div>
  )
}

export default PropertyForm

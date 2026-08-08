import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useGetPropertyQuery, useCreatePropertyMutation, useUpdatePropertyMutation } from '@/features/properties/api/propertiesApi'
import { useGetAmenitiesQuery } from '@/features/core/api/amenitiesApi'
import { LoadingState } from '@/components/ui/loading-state'
import { PropertyFormFields } from '@/features/properties/components/PropertyFormFields'
import { propertyFormPageSchema, type PropertyFormPageValues } from '@/features/properties/validations'
import { applyServerValidation } from '@/lib/formErrors'
import { getErrorMessage } from '@/lib/errors'
import { FormRootError } from '@/components/ui/form-root-error'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import FadeContent from '@/components/reactbits/FadeContent'

const propertySchema = propertyFormPageSchema

type PropertyFormData = PropertyFormPageValues

interface Location {
  latitude: number
  longitude: number
}

const propertyTypes = [
  'house', 'apartment', 'builder_floor', 'room', 'villa', 'plot', 'condo',
  'penthouse', 'studio', 'loft', 'pg', 'flatmate', 'office', 'shop', 'warehouse',
] as const
const purposes = ['buy', 'rent', 'short_stay'] as const
const isPropertyType = (value: string): value is (typeof propertyTypes)[number] =>
  propertyTypes.includes(value as (typeof propertyTypes)[number])
const isPurpose = (value: string): value is (typeof purposes)[number] =>
  purposes.includes(value as (typeof purposes)[number])

const PropertyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEditing = !!id

  const [location, setLocation] = useState<Location | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  // Fetch property data if editing
  const { data: property, isLoading: propertyLoading, isError: propertyError, error: propertyLoadError, refetch: refetchProperty } = useGetPropertyQuery(Number(id), {
    skip: !isEditing,
  })

  // Fetch amenities
  const { data: amenities } = useGetAmenitiesQuery()

  // Mutations
  const [createProperty, { isLoading: creating }] = useCreatePropertyMutation()
  const [updateProperty, { isLoading: updating }] = useUpdatePropertyMutation()

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      description: '',
      property_type: 'apartment',
      purpose: 'rent',
      base_price: 0,
      city: '',
      locality: '',
      pincode: '',
      area_sqft: 0,
      bedrooms: 0,
      bathrooms: 0,
      balconies: 0,
      parking_spaces: 0,
      floor_number: 0,
      total_floors: 0,
      age_of_property: 0,
      max_occupancy: 0,
      minimum_stay_days: 1,
      amenity_ids: [],
      features: [],
      owner_name: '',
      owner_contact: '',
    },
  })

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (form.formState.isDirty) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [form.formState.isDirty])

  useEffect(() => {
    if (property && isEditing) {
      form.reset({
        title: property.title,
        description: property.description,
        property_type: property.property_type,
        purpose: property.purpose,
        base_price: property.base_price,
        city: property.city,
        locality: property.locality,
        pincode: property.pincode,
        area_sqft: property.area_sqft,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        balconies: property.balconies || 0,
        parking_spaces: property.parking_spaces || 0,
        floor_number: property.floor_number || 0,
        total_floors: property.total_floors || 0,
        age_of_property: property.age_of_property || 0,
        max_occupancy: property.max_occupancy || 0,
        minimum_stay_days: property.minimum_stay_days || 1,
        amenity_ids: (property.amenities || []).map((a) => a.id),
        features: property.features || [],
        owner_name: property.owner_name || '',
        owner_contact: property.owner_contact || '',
      })
      if (property.latitude !== undefined && property.longitude !== undefined) {
        setLocation({
          latitude: property.latitude,
          longitude: property.longitude,
        })
      }
      setUploadedImages((property.images || []).map((image) => image.image_url))
      setSelectedFeatures(property.features || [])
    }
  }, [property, isEditing, form])

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => {
      const next = prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
      form.setValue('features', next)
      return next
    })
  }

  const toggleAmenity = (amenityId: number) => {
    const currentAmenities = form.getValues('amenity_ids')
    const newAmenities = currentAmenities.includes(amenityId)
      ? currentAmenities.filter(id => id !== amenityId)
      : [...currentAmenities, amenityId]
    form.setValue('amenity_ids', newAmenities)
  }

  const onSubmit = async (data: PropertyFormData) => {
    if (!location) {
      toast({
        title: 'Location Required',
        description: 'Please select a location on the map.',
        variant: 'destructive',
      })
      return
    }

    try {
      const propertyData = {
        ...data,
        latitude: location.latitude,
        longitude: location.longitude,
        features: selectedFeatures,
        main_image_url: uploadedImages[0] || '',
      }

      if (isEditing) {
        await updateProperty({ id: Number(id), data: propertyData }).unwrap()
        toast({
          title: 'Property Updated',
          description: 'Property has been updated successfully.',
        })
      } else {
        await createProperty({
          data: propertyData,
          ownerId: undefined,
        }).unwrap()
        toast({
          title: 'Property Created',
          description: 'Property has been created successfully.',
        })
      }
      navigate('/properties')
    } catch (error) {
      applyServerValidation(error, form.setError)
      toast({
        title: 'Operation Failed',
        description: getErrorMessage(
          error,
          isEditing
            ? 'Failed to update property. Please try again.'
            : 'Failed to create property. Please try again.',
        ),
        variant: 'destructive',
      })
    }
  }

  const availableFeatures = [
    'gym', 'pool', 'parking', 'security', 'lift', 'power_backup',
    'garden', 'play_area', 'club_house', 'jogging_track', 'rainwater_harvesting',
    'solar_panels', 'intercom', 'cctv', 'fire_safety', 'waste_disposal'
  ]

  if (propertyLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingState type="spinner" />
      </div>
    )
  }

  if (isEditing && propertyError) {
    return (
      <ErrorState
        title="Failed to load property"
        error={propertyLoadError}
        onRetry={() => void refetchProperty()}
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={isEditing ? 'Edit Property' : 'Create New Property'}
        description={
          isEditing
            ? 'Update property information and details'
            : 'Add a new property to the platform'
        }
        icon={Building2}
      />

      <FadeContent container="#main-content" threshold={0} duration={600}>
        <form onSubmit={(e) => {
        if (!location) {
          toast({
            title: 'Location Required',
            description: 'Please select a location on the map.',
            variant: 'destructive',
          })
          return
        }
        void form.handleSubmit(onSubmit)(e)
      }} className="space-y-6">
        <FormRootError form={form} />
        <PropertyFormFields
          form={form}
          location={location}
          setLocation={setLocation}
          uploadedImages={uploadedImages}
          setUploadedImages={setUploadedImages}
          removeImage={removeImage}
          selectedFeatures={selectedFeatures}
          toggleFeature={toggleFeature}
          toggleAmenity={toggleAmenity}
          amenities={amenities}
          isEditing={isEditing}
          creating={creating}
          updating={updating}
          property={property}
          availableFeatures={availableFeatures}
          isPropertyType={isPropertyType}
          isPurpose={isPurpose}
          onCancel={() => navigate('/properties')}
        />
        </form>
      </FadeContent>
    </div>
  )
}

export default PropertyFormPage

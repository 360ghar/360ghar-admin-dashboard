import type { ReactNode } from 'react'
import { useDeletePropertyMutation, useGetPropertyQuery } from '@/features/properties/api/propertiesApi'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { PropertyStatusBadge } from './PropertyStatusBadge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link, useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import MapPreview from './parts/MapPreview'
import TiltedCard from '@/components/reactbits/TiltedCard'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

const Item = ({ label, value }: { label: string; value?: string | number | boolean | null }) => (
  <div className="text-sm"><span className="text-muted-foreground">{label}: </span>{String(value ?? '-')}</div>
)

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <div className="font-medium text-sm text-muted-foreground mb-2">{children}</div>
)

const PropertyDetail = ({ id }: { id: number }) => {
  const { data, isLoading, error, refetch } = useGetPropertyQuery(id)
  const [del, delState] = useDeletePropertyMutation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const prefersReducedMotion = usePrefersReducedMotion()

  const doDelete = async () => {
    try {
      await del(id).unwrap()
      navigate('/properties')
    } catch (e) {
      toast({ title: 'Delete Failed', description: getErrorMessage(e, 'Could not delete property'), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState type="card" rows={8} />
  if (error) return <ErrorState title="Failed to load property" error={error} onRetry={() => void refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.title || 'Property Details'}
        description="View complete information"
        icon={Building2}
        breadcrumbs={[
          { label: 'Properties', to: '/properties' },
          { label: data?.title || `#${id}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {data?.status && <PropertyStatusBadge status={data.status} />}
            <Button asChild variant="outline" size="sm" className="rounded-cohere-pill">
              <Link to={`/properties/${id}`}>Edit</Link>
            </Button>
            <ConfirmAlertDialog
              title="Delete property?"
              description="This action cannot be undone. This will permanently remove the property."
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={() => void doDelete()}
            >
              {(openDialog) => (
                <Button variant="destructive" size="sm" onClick={openDialog} disabled={delState.isLoading}>
                  {delState.isLoading ? 'Deleting…' : 'Delete'}
                </Button>
              )}
            </ConfirmAlertDialog>
          </div>
        }
      />

      <FadeContent container="#main-content" threshold={0} duration={600}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>{data?.title || 'Property'}</span>
              {data?.status && <PropertyStatusBadge status={data.status} />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Hero */}
            {data?.main_image_url && (
              <div className="mx-auto max-w-xl">
                {prefersReducedMotion ? (
                  <img
                    src={data.main_image_url}
                    alt={data.title || 'Property'}
                    className="h-80 w-full rounded-cohere-md object-cover"
                  />
                ) : (
                  <TiltedCard
                    imageSrc={data.main_image_url}
                    altText={data.title || 'Property'}
                    imageHeight="320px"
                    imageWidth="100%"
                    containerHeight="320px"
                    containerWidth="100%"
                    rotateAmplitude={3}
                    scaleOnHover={1.02}
                    showMobileWarning={false}
                    showTooltip={false}
                  />
                )}
              </div>
            )}
          {/* Overview */}
          <div className="grid gap-3 md:grid-cols-3">
            <Item label="Type" value={data?.property_type} />
            <Item label="Purpose" value={data?.purpose} />
            <Item label="Price" value={data?.base_price ? formatCurrency(data.base_price) : '-'} />
            <Item label="Created" value={data?.created_at ? formatDate(data.created_at) : '-'} />
            <Item label="Liked" value={data?.liked ? 'Yes' : 'No'} />
            <Item label="Next Visit" value={data?.user_next_visit_date ? formatDateTime(data.user_next_visit_date) : '-'} />
          </div>

          {/* Location */}
          <div>
            <SectionTitle>Location</SectionTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <Item label="City" value={data?.city} />
              <Item label="Locality" value={data?.locality} />
              <Item label="Pincode" value={data?.pincode} />
            </div>
            {data?.latitude != null && data?.longitude != null && !Number.isNaN(Number(data.latitude)) && !Number.isNaN(Number(data.longitude)) && (
              <div className="mt-3">
                <MapPreview lat={Number(data.latitude)} lng={Number(data.longitude)} height={220} />
                <div className="mt-2 text-xs text-muted-foreground">
                  Lat: {data.latitude}, Lng: {data.longitude}
                </div>
              </div>
            )}
          </div>

          {/* Specifications */}
          <div>
            <SectionTitle>Specifications</SectionTitle>
            <div className="grid gap-3 md:grid-cols-4">
              <Item label="Area (sqft)" value={data?.area_sqft} />
              <Item label="Bedrooms" value={data?.bedrooms} />
              <Item label="Bathrooms" value={data?.bathrooms} />
              <Item label="Balconies" value={data?.balconies} />
              <Item label="Parking" value={data?.parking_spaces} />
              <Item label="Floor" value={data?.floor_number} />
              <Item label="Total Floors" value={data?.total_floors} />
              <Item label="Age (years)" value={data?.age_of_property} />
              <Item label="Max Occupancy" value={data?.max_occupancy} />
              <Item label="Min Stay (days)" value={data?.minimum_stay_days} />
            </div>
          </div>

          {/* Owner */}
          <div>
            <SectionTitle>Owner</SectionTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <Item label="Owner ID" value={data?.owner_id} />
              <Item label="Name" value={data?.owner_name} />
              <Item label="Contact" value={data?.owner_contact} />
            </div>
          </div>

          {/* Amenities & Features */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <SectionTitle>Amenities</SectionTitle>
              {data?.amenities?.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.amenities.map((a) => (
                    <Badge key={a.id} variant="secondary" className="capitalize">
                      {(a.title || 'Amenity').replaceAll('_', ' ')}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No amenities listed</div>
              )}
            </div>
            <div>
              <SectionTitle>Features</SectionTitle>
              {data?.features?.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.features.map((f) => (
                    <Badge key={f} variant="outline" className="capitalize">{f.replaceAll('_', ' ')}</Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No features listed</div>
              )}
            </div>
          </div>

          {/* Media */}
          {data?.images && data.images.length > 0 && (
            <div>
              <SectionTitle>Media</SectionTitle>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {data.images.map((image) => (
                  <img key={image.id} src={image.image_url} alt={image.caption || `Property image ${image.id}`} loading="lazy" className="h-28 w-full rounded-cohere-sm object-cover" />
                ))}
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </FadeContent>
    </div>
  )
}

export default PropertyDetail

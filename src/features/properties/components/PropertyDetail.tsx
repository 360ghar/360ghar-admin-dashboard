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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState, type ReactNode } from 'react'
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
  const [openDelete, setOpenDelete] = useState(false)
  const [del, delState] = useDeletePropertyMutation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const doDelete = async () => {
    try {
      await del(id).unwrap()
      setOpenDelete(false)
      navigate('/properties')
    } catch (e) {
      setOpenDelete(false)
      toast({ title: 'Delete Failed', description: getErrorMessage(e, 'Could not delete property'), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState type="card" rows={8} />
  if (error) return <ErrorState title="Failed to load property" error={error} onRetry={() => void refetch()} />

  return (
    <div className="space-y-4">
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
            <Button variant="destructive" size="sm" onClick={() => setOpenDelete(true)} disabled={delState.isLoading}>
              {delState.isLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>{data?.title || 'Property'}</span>
            {data?.status && <PropertyStatusBadge status={data.status} />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  <img key={image.id} src={image.image_url} alt={image.caption || `Property image ${image.id}`} loading="lazy" className="h-28 w-full rounded-md object-cover" />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete property?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the property.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void doDelete() }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PropertyDetail

import { AlertCircle, Clock, Edit2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import TiltedCard from '@/components/reactbits/TiltedCard'

import { formatCurrency, formatDateTime } from '@/lib/format'
import type { FlatmatesListing } from '../types'
import { getPrescreenFlags, getPrescreenReason, getPrescreenResult } from './moderationUtils'

interface ModerationListingCardProps {
  listing: FlatmatesListing
  onReview: (listing: FlatmatesListing) => void
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending_review: 'secondary',
    live: 'default',
    rejected: 'destructive',
    paused: 'outline',
    expired: 'outline',
  }
  return (
    <Badge variant={variants[status] || 'outline'}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </Badge>
  )
}

const getOverdueBadge = (createdAt: string) => {
  const created = new Date(createdAt)
  const now = new Date()
  const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

  if (hoursDiff > 24) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        OVERDUE
      </Badge>
    )
  }
  return null
}

export function ModerationListingCard({ listing, onReview }: ModerationListingCardProps) {
  const prescreenFlags = getPrescreenFlags(listing)
  const prescreenReason = getPrescreenReason(listing)
  const isFlagged = getPrescreenResult(listing) === 'flagged'

  return (
    <Card
      className={`transition-colors hover:border-cohere-hairline ${
        prescreenFlags.some((flag) => flag.severity === 'high') ? 'border-destructive/50' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold">{listing.title}</h3>
              {getStatusBadge(listing.status)}
              {getOverdueBadge(listing.created_at)}
              {isFlagged && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  AI FLAG
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {listing.locality && <span>{listing.locality}</span>}
              {listing.city && <span>, {listing.city}</span>}
              {listing.monthly_rent && (
                <span className="ml-2">• {formatCurrency(listing.monthly_rent)}/mo</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onReview(listing)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Review
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {listing.main_image_url && (
            <div className="md:col-span-1">
              <div className="h-48 overflow-hidden rounded-cohere-sm md:h-full md:min-h-[12rem]">
                <TiltedCard
                  imageSrc={listing.main_image_url}
                  altText={listing.title}
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="100%"
                  imageWidth="100%"
                  rotateAmplitude={2}
                  scaleOnHover={1.03}
                  showMobileWarning={false}
                  showTooltip={false}
                />
              </div>
            </div>
          )}
          <div className={listing.main_image_url ? 'md:col-span-2' : 'md:col-span-3'}>
            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-sm mb-1">Description</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {listing.description || 'No description provided'}
                </p>
              </div>
              {listing.features && listing.features.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {listing.features.slice(0, 8).map((feature, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {prescreenReason && (
                <div className="rounded-cohere-md border border-destructive/30 bg-destructive/10 p-3 backdrop-blur-md">
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold">AI flag:</span> {prescreenReason}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Submitted {formatDateTime(listing.created_at)}
                </span>
                {listing.bedrooms && <span>{listing.bedrooms} BHK</span>}
                {listing.area_sqft && <span>{listing.area_sqft} sqft</span>}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

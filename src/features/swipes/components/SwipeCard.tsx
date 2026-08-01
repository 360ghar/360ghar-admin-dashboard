import { forwardRef, useState } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Bed, Bath, Square, X, Heart, Info, ImageIcon, Loader2 } from 'lucide-react'
import { Property } from '@/features/properties/api/propertiesApi'
import { formatCurrency } from '@/lib/format'
import { getPropertyStatusColor } from '@/lib/statusColors'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SwipeCardProps {
  property: Property
  /** Resolves on success; rejects (or throws) on failure so the card can stay put. */
  onSwipe: (direction: 'left' | 'right') => Promise<void>
}

const SWIPE_THRESHOLD = 110

const SwipeCard = forwardRef<HTMLDivElement, SwipeCardProps>(function SwipeCard(
  { property, onSwipe },
  ref,
) {
  const [exitX, setExitX] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-12, 12])
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1])
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0])
  const cardScale = useTransform(x, [-220, 0, 220], [0.99, 1, 0.99])

  const imageSrc =
    property.main_image_url ||
    property.images?.find((i) => i.is_main_image)?.image_url ||
    property.images?.[0]?.image_url
  const locationLabel =
    [property.locality, property.city].filter(Boolean).join(', ') || 'Location unavailable'
  const description = property.description?.trim()

  const performSwipe = async (direction: 'left' | 'right') => {
    if (isPending) return
    setIsPending(true)
    try {
      await onSwipe(direction)
      setExitX(direction === 'right' ? 420 : -420)
    } catch {
      x.set(0)
    } finally {
      setIsPending(false)
    }
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isPending) {
      x.set(0)
      return
    }
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 700) {
      void performSwipe('right')
    } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -700) {
      void performSwipe('left')
    } else {
      x.set(0)
    }
  }

  const mediaBlock = (
    <div className="relative h-56 w-full shrink-0 bg-muted md:h-auto md:w-[52%] md:min-h-0">
      {!imgFailed && imageSrc ? (
        <img
          src={imageSrc}
          alt={property.title || 'Property'}
          className="h-full w-full object-cover pointer-events-none select-none"
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full min-h-[14rem] flex-col items-center justify-center gap-2 text-muted-foreground md:min-h-full">
          <ImageIcon className="h-12 w-12 opacity-40" />
          <span className="text-sm">No photo</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent md:hidden" />

      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        {property.status && (
          <Badge
            variant={getPropertyStatusColor(property.status)}
            className="capitalize shadow-sm backdrop-blur-sm"
          >
            {property.status.replace(/_/g, ' ')}
          </Badge>
        )}
        <Badge variant="secondary" className="capitalize bg-background/90 backdrop-blur-sm shadow-sm">
          {[property.property_type, property.purpose].filter(Boolean).join(' · ')}
        </Badge>
      </div>

      {/* Drag feedback stamps — over media */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute top-14 left-4 rotate-[-12deg] rounded-md border-4 border-emerald-400 px-3 py-1 text-lg font-bold tracking-widest text-emerald-400"
      >
        LIKE
      </motion.div>
      <motion.div
        style={{ opacity: passOpacity }}
        className="pointer-events-none absolute top-14 right-4 rotate-[12deg] rounded-md border-4 border-rose-400 px-3 py-1 text-lg font-bold tracking-widest text-rose-400"
      >
        PASS
      </motion.div>

      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Saving swipe" />
        </div>
      )}
    </div>
  )

  const actionBar = (
    <div className="flex shrink-0 items-center justify-center gap-4 border-t border-cohere-card-border bg-card px-4 py-3">
      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={isPending}
          className={cn(
            'h-14 w-14 rounded-full border-2',
            'border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300',
            'dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40',
          )}
          onClick={() => { void performSwipe('left') }}
          aria-label="Pass property"
        >
          <X className="h-7 w-7" />
        </Button>
        <span className="text-[10px] font-medium text-muted-foreground">Pass</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className={cn(
            'h-12 w-12 rounded-full border',
            'border-cohere-hairline text-cohere-action-blue hover:bg-cohere-pale-blue',
          )}
          asChild
          aria-label="View property details"
        >
          <Link to={`/properties/${property.id}/view`}>
            <Info className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-[10px] font-medium text-muted-foreground">Details</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={isPending}
          className={cn(
            'h-14 w-14 rounded-full border-2',
            'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300',
            'dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
          )}
          onClick={() => { void performSwipe('right') }}
          aria-label="Like property"
        >
          <Heart className="h-7 w-7 fill-current" />
        </Button>
        <span className="text-[10px] font-medium text-muted-foreground">Like</span>
      </div>
    </div>
  )

  return (
    <motion.div
      ref={ref}
      style={{ x, rotate, scale: cardScale }}
      drag={isPending ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0, x: exitX || undefined }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="absolute inset-0 w-full cursor-grab active:cursor-grabbing touch-pan-y"
    >
      <Card className="flex h-full w-full flex-col overflow-hidden border border-cohere-card-border bg-card shadow-none md:flex-row">
        {mediaBlock}

        {/* Right / bottom: details — only this region scrolls */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:w-[48%]">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {property.title || `Property #${property.id}`}
              </h2>
              <p className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{locationLabel}</span>
              </p>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {formatCurrency(property.base_price)}
              </span>
              {property.area_sqft != null && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {property.area_sqft} sqft
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Bed, label: 'Beds', value: property.bedrooms },
                { icon: Bath, label: 'Baths', value: property.bathrooms },
                { icon: Square, label: 'Sqft', value: property.area_sqft },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-cohere-sm border border-cohere-card-border bg-muted/40 px-2 py-2.5"
                >
                  <Icon className="mb-1 h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium tabular-nums">{value ?? '—'}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {(property.amenities?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {property.amenities?.map((amenity, i) => (
                  <Badge key={amenity.id ?? i} variant="secondary" className="text-xs font-normal">
                    {amenity.title}
                  </Badge>
                ))}
              </div>
            )}

            {description && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">About</p>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            )}

            {(property.features?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Features</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground/90">
                  {property.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {actionBar}
        </div>
      </Card>
    </motion.div>
  )
})

SwipeCard.displayName = 'SwipeCard'

export default SwipeCard

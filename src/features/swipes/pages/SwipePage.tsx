import { useCallback, useEffect, useState } from 'react'
import { useGetRecommendationsQuery } from '@/features/properties/api/propertiesApi'
import { useSwipePropertyMutation } from '@/features/swipes/api/swipesApi'
import SwipeCard from '../components/SwipeCard'
import { Heart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { AnimatePresence } from 'motion/react'
import { getErrorMessage } from '@/lib/errors'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const SwipePage = () => {
  const { toast } = useToast()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [currentIndex, setCurrentIndex] = useState(0)
  const { data: recommendations, isLoading, isError, refetch } = useGetRecommendationsQuery({ limit: 10 })
  const [swipeProperty] = useSwipePropertyMutation()

  const currentProperties = recommendations?.items ?? []
  const isFinished = currentIndex >= currentProperties.length
  const isEmptyQueue = currentProperties.length === 0
  const remaining = Math.max(0, currentProperties.length - currentIndex)

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const items = recommendations?.items ?? []
    if (!items[currentIndex]) {
      throw new Error('No property to swipe')
    }

    const property = items[currentIndex]
    const isLiked = direction === 'right'

    try {
      const result = await swipeProperty({
        property_id: property.id,
        is_liked: isLiked,
      }).unwrap()

      setCurrentIndex((prev) => prev + 1)

      if (result.match) {
        toast({
          title: "It's a Match!",
          description: `You matched with ${property.title || `property #${property.id}`}`,
          variant: 'default',
        })
      }
    } catch (error) {
      toast({
        title: 'Swipe failed',
        description: getErrorMessage(error, 'Something went wrong. Please try again.'),
        variant: 'destructive',
      })
      throw error
    }
  }, [recommendations?.items, currentIndex, swipeProperty, toast])

  useEffect(() => {
    if (isFinished || isLoading || isError) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        void handleSwipe('left').catch(() => {})
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        void handleSwipe('right').catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSwipe, isFinished, isLoading, isError])

  const reset = () => {
    setCurrentIndex(0)
    void refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-8rem)]">
        <LoadingState type="spinner" text="Finding properties…" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-8rem)] px-4">
        <ErrorState title="Failed to load recommendations" onRetry={() => void refetch()} />
      </div>
    )
  }

  const deckContent = (
    <>
      {!isFinished && remaining > 1 && (
        <div
          aria-hidden
          className="absolute inset-x-2 bottom-0 top-3 rounded-cohere-lg border border-cohere-card-border bg-card/40 backdrop-blur-md md:inset-x-3"
        />
      )}

      <AnimatePresence mode="popLayout">
        {!isFinished && currentProperties[currentIndex] && (
          <SwipeCard
            key={currentProperties[currentIndex].id}
            property={currentProperties[currentIndex]}
            onSwipe={handleSwipe}
          />
        )}
      </AnimatePresence>

      {isFinished && (
        <div className="flex h-full w-full items-center justify-center">
          <EmptyState
            className="w-full max-w-md"
            icon={<Heart className="h-12 w-12" />}
            title={isEmptyQueue ? 'No recommendations yet' : 'No more properties'}
            description={
              isEmptyQueue
                ? "We don't have properties to show right now. Check back later or refresh the queue."
                : "You've gone through all the recommendations for now."
            }
            action={{
              label: isEmptyQueue ? 'Refresh' : 'Start over',
              onClick: reset,
              variant: 'default',
            }}
          />
        </div>
      )}
    </>
  )

  const deckClassName =
    'relative mx-auto h-[min(560px,calc(100dvh-13rem))] w-full max-w-4xl md:h-[min(480px,calc(100dvh-12rem))]'

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 pb-24 md:pb-8">
      <PageHeader
        className="w-full"
        title="Discover"
        description={
          isFinished
            ? 'Queue complete — refresh for more picks'
            : 'Swipe right to like · left to pass · arrows work too'
        }
        icon={Heart}
        badge={!isFinished && remaining > 0 ? `${remaining} left` : undefined}
      />

      {prefersReducedMotion ? (
        <div className={deckClassName}>{deckContent}</div>
      ) : (
        <FadeContent container="#main-content" threshold={0} duration={600} className={deckClassName}>
          {deckContent}
        </FadeContent>
      )}
    </div>
  )
}

export default SwipePage

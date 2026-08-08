import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { bookingReviewSchema, type BookingReviewFormValues } from '@/features/bookings/validations'

const BookingReviewForm: React.FC<{ onSubmit: (data: BookingReviewFormValues) => void; onCancel?: () => void }> = ({ onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<BookingReviewFormValues>({
    resolver: zodResolver(bookingReviewSchema),
    defaultValues: {
      guest_rating: 5,
    },
  })

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
      <div className="space-y-2">
        <Label>Overall Rating</Label>
        <div className="flex gap-1">
          {([1, 2, 3, 4, 5] as const).map((rating) => (
            <label key={rating} className="cursor-pointer">
              <input
                type="radio"
                {...register('guest_rating', { valueAsNumber: true })}
                value={rating}
                className="sr-only"
              />
              <Star
                className={`h-6 w-6 ${
                  rating <= (watch('guest_rating') || 0)
                    ? 'text-yellow-400 fill-current'
                    : 'text-muted-foreground opacity-30'
                }`}
              />
            </label>
          ))}
        </div>
        {errors.guest_rating && (
          <p className="text-sm text-destructive">{errors.guest_rating.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest_review">Review (Optional)</Label>
        <Textarea
          id="guest_review"
          {...register('guest_review')}
          placeholder="Share your experience..."
          rows={4}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export { BookingReviewForm }

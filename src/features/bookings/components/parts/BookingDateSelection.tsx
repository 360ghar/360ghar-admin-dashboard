import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CalendarDays } from 'lucide-react'
import { isAfter, isBefore, differenceInDays, startOfDay } from 'date-fns'
import { formatCurrency } from '@/lib/format'
import type { BookingPricing, AvailabilityInfo } from '@/types/api'

interface BookingDateSelectionProps {
  selectedDates: { from: Date | undefined; to: Date | undefined }
  setSelectedDates: React.Dispatch<React.SetStateAction<{ from: Date | undefined; to: Date | undefined }>>
  pricingInfo: BookingPricing | null
  availabilityInfo: AvailabilityInfo | null
}

const BookingDateSelection: React.FC<BookingDateSelectionProps> = ({ selectedDates, setSelectedDates, pricingInfo, availabilityInfo }) => (
  <div className="space-y-4">
    <Label className="text-base">Select Dates</Label>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Check-in Date</Label>
        <Calendar mode="single" selected={selectedDates.from}
          onSelect={(date) => {
            setSelectedDates((prev) => {
              const next = { ...prev, from: date }
              if (date && prev.to && !isAfter(prev.to, date)) {
                next.to = undefined
              }
              return next
            })
          }}
          disabled={(date) => isBefore(date, startOfDay(new Date()))} />
      </div>
      <div className="space-y-2">
        <Label>Check-out Date</Label>
        <Calendar mode="single" selected={selectedDates.to}
          onSelect={(date) => setSelectedDates(prev => ({ ...prev, to: date }))}
          disabled={(date) => !selectedDates.from || !isAfter(date, selectedDates.from)} />
      </div>
    </div>
    {selectedDates.from && selectedDates.to && (
      <div className="text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 inline mr-1" />{differenceInDays(selectedDates.to, selectedDates.from)} nights</div>
    )}
    {availabilityInfo && !availabilityInfo.available && (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800/40"><p className="text-sm text-red-800 dark:text-red-300">{availabilityInfo.reason || 'Property is not available for selected dates'}</p></div>
    )}
    {pricingInfo && (
      <Card>
        <CardHeader><CardTitle className="text-sm">Pricing Details</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm"><span>Base Price ({formatCurrency(pricingInfo.base_amount)} / {pricingInfo.nights} nights)</span><span>{formatCurrency(pricingInfo.base_amount)}</span></div>
          <div className="flex justify-between text-sm"><span>Taxes</span><span>{formatCurrency(pricingInfo.taxes_amount)}</span></div>
          <div className="flex justify-between text-sm"><span>Service Fee</span><span>{formatCurrency(pricingInfo.service_charges)}</span></div>
          <Separator />
          <div className="flex justify-between font-medium"><span>Total Amount</span><span>{formatCurrency(pricingInfo.total_amount)}</span></div>
        </CardContent>
      </Card>
    )}
  </div>
)

export default BookingDateSelection

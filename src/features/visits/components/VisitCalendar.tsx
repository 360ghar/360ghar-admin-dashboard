import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import type { Visit } from '@/types/api'
import { parseServerTimestamp } from '@/lib/dateTime'
import { getVisitStatusLabel } from '@/lib/statusColors'

interface VisitCalendarProps {
  visits: Visit[]
  onDateSelect: (date: Date) => void
  selectedDate?: Date
}

const VisitCalendar: React.FC<VisitCalendarProps> = ({ visits = [], onDateSelect, selectedDate }) => {
  const hasVisitOnDate = (date: Date) => {
    return visits.some(visit => {
      const visitDate = parseServerTimestamp(visit.scheduled_date)
      if (!visitDate) return false
      return format(visitDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
  }

  const getVisitsForDate = (date: Date) => {
    return visits.filter(visit => {
      const visitDate = parseServerTimestamp(visit.scheduled_date)
      if (!visitDate) return false
      return format(visitDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-cohere-md border border-cohere-card-border bg-card/40 p-3 backdrop-blur-md">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          className="rounded-md"
          modifiers={{
            hasVisit: (date) => hasVisitOnDate(date)
          }}
          modifiersClassNames={{
            hasVisit:
              'relative bg-primary/10 font-semibold after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-cohere-coral after:content-[""]',
          }}
        />
      </div>
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Visits for {format(selectedDate, 'MMM dd, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getVisitsForDate(selectedDate).length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits scheduled</p>
            ) : (
              <div className="space-y-2">
                {getVisitsForDate(selectedDate).map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-2 border border-cohere-card-border/70 rounded-cohere-sm">
                    <div>
                      <p className="text-sm font-medium">{visit.property?.title || `Property #${visit.property_id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const visitDate = parseServerTimestamp(visit.scheduled_date)
                          return visitDate ? format(visitDate, 'HH:mm') : 'Invalid date'
                        })()}
                      </p>
                    </div>
                    <Badge variant={visit.status === 'requested' || visit.status === 'confirmed' ? 'default' : 'secondary'}>
                      {getVisitStatusLabel(visit.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { VisitCalendar }
export type { VisitCalendarProps }

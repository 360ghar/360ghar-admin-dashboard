import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { useGetPmInspectionQuery } from '@/features/pm/api/pmApi'
import { formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'

export default function PmInspectionDetailPage() {
  const { inspectionId } = useParams()
  const inspectionIdNum = Number(inspectionId)

  const inspection = useGetPmInspectionQuery(inspectionIdNum, { skip: !inspectionIdNum })

  const roomsJson = useMemo(() => {
    if (!inspection.data?.rooms_data) return null
    try {
      return JSON.stringify(inspection.data.rooms_data, null, 2)
    } catch {
      return null
    }
  }, [inspection.data?.rooms_data])

  if (!inspectionIdNum || Number.isNaN(inspectionIdNum)) {
    return <EmptyState title="Invalid inspection id" />
  }

  if (inspection.isError) {
    return (
      <ErrorState
        title="Failed to load inspection"
        error={inspection.error}
        onRetry={() => { void inspection.refetch() }}
      />
    )
  }

  if (inspection.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Inspection #${inspection.data?.id ?? inspectionIdNum}`}
        description={`Lease #${inspection.data?.lease_id} • Property #${inspection.data?.property_id}`}
        breadcrumbs={[
          { label: 'Inspections', to: '/pm/inspections' },
          { label: `Inspection #${inspection.data?.id ?? inspectionIdNum}` },
        ]}
        actions={
          <Badge variant="secondary" className="h-fit">
            <ClipboardCheck className="mr-1 h-3 w-3" />
            {inspection.data?.inspection_type || '—'}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Rooms data</CardTitle>
          </CardHeader>
          <CardContent>
            {roomsJson ? (
              <pre className="max-h-[520px] overflow-auto rounded-cohere-md border border-cohere-card-border bg-card/40 p-4 text-xs backdrop-blur-md">
                {roomsJson}
              </pre>
            ) : (
              <EmptyState title="No rooms data" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {inspection.data ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Conducted</span>
                  <span className="font-medium">{inspection.data.conducted_at ? formatDateTime(inspection.data.conducted_at) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signed (owner)</span>
                  <Badge variant={inspection.data.signed_by_owner_at ? 'default' : 'outline'}>
                    {inspection.data.signed_by_owner_at ? 'yes' : 'no'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signed (tenant)</span>
                  <Badge variant={inspection.data.signed_by_tenant_at ? 'default' : 'outline'}>
                    {inspection.data.signed_by_tenant_at ? 'yes' : 'no'}
                  </Badge>
                </div>
                {inspection.data.overall_notes ? (
                  <div className="pt-2">
                    <div className="text-xs font-medium text-muted-foreground">Notes</div>
                    <div className="text-sm">{inspection.data.overall_notes}</div>
                  </div>
                ) : null}
                <div className="pt-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to={`/pm/leases/${inspection.data.lease_id}`}>Open lease</Link>
                  </Button>
                  <Button asChild variant="outline" className="mt-2 w-full justify-start">
                    <Link to={`/pm/properties/${inspection.data.property_id}`}>Open property</Link>
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState title="Inspection not found" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

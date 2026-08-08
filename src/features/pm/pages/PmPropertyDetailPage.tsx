import { Link, useParams } from 'react-router-dom'
import { Building2, FileText } from 'lucide-react'
import type { ManagedPropertyStatus } from '@/types/pm'
import { useGetPmPropertyDetailQuery } from '@/features/pm/api/pmApi'
import { formatCurrency } from '@/lib/format'
import { deriveNightlyRate } from '@/features/properties/lib/nightlyRate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { PropertySettingsEditDialog } from '@/features/pm/components/PropertySettingsEditDialog'
import CountUp from '@/components/reactbits/CountUp'

const statusVariant = (status?: ManagedPropertyStatus | null) => {
  if (status === 'active') return 'default'
  if (status === 'draft') return 'secondary'
  return 'outline'
}

export default function PmPropertyDetailPage() {
  const { propertyId } = useParams()
  const propertyIdNum = Number(propertyId)

  const detail = useGetPmPropertyDetailQuery(propertyIdNum, { skip: !propertyIdNum })

  const prop = detail.data?.property
  const activeLease = detail.data?.active_lease
  const nightly = prop ? deriveNightlyRate(prop) : null

  if (!propertyIdNum || Number.isNaN(propertyIdNum)) {
    return <EmptyState title="Invalid property id" />
  }

  if (detail.isError) {
    return (
      <ErrorState
        title="Failed to load property"
        error={detail.error}
        onRetry={() => { void detail.refetch() }}
      />
    )
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent><Skeleton className="h-9 w-40" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent><Skeleton className="h-9 w-40" /></CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={prop?.title || `Property #${propertyIdNum}`}
        description={(prop?.full_address || prop?.locality || prop?.city || '').toString() || '—'}
        icon={Building2}
        breadcrumbs={[
          { label: 'Managed Properties', to: '/pm/properties' },
          { label: prop?.title || `#${propertyIdNum}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">ID: {propertyIdNum}</Badge>
            <Badge variant={statusVariant(prop?.management_status)}>{prop?.management_status || '—'}</Badge>
            <PropertySettingsEditDialog property={prop} activeLease={activeLease} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {prop ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium">#{prop.owner_id}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Base price</span>
                  <span className="font-medium tabular-nums">{prop.base_price != null ? formatCurrency(prop.base_price) : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Monthly rent</span>
                  <span className="font-medium tabular-nums">{prop.monthly_rent != null ? formatCurrency(prop.monthly_rent) : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Daily rate</span>
                  <span className="font-medium tabular-nums">{prop.daily_rate != null ? formatCurrency(prop.daily_rate) : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Nightly (derived)</span>
                  <span className="font-medium tabular-nums">{nightly != null ? formatCurrency(nightly) : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Occupancy</span>
                  <Badge variant={prop.current_lease_id ? 'default' : 'outline'}>
                    {prop.current_lease_id ? 'occupied' : 'vacant'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Payment due day</span>
                  <span className="font-medium">{prop.payment_due_day ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Grace period</span>
                  <span className="font-medium">{prop.grace_period_days ?? '—'} days</span>
                </div>
              </>
            ) : (
              <EmptyState title="Property not found" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lease & Tenant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activeLease ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Lease</span>
                  <Button asChild variant="link" className="h-auto p-0">
                    <Link to={`/pm/leases/${activeLease.id}`}>#{activeLease.id}</Link>
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{activeLease.status}</Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Tenant</span>
                  <span className="font-medium">{activeLease.tenant_name || activeLease.tenant_phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Monthly rent</span>
                  <CountUp
                    to={activeLease.monthly_rent}
                    duration={1.2}
                    format={(n) => formatCurrency(n)}
                    className="font-medium tabular-nums"
                  />
                </div>
              </>
            ) : (
              <EmptyState title="No active lease" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Rent</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/pm/rent-ledger">Open rent ledger</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/pm/documents">Open documents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

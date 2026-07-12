import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Building2, FileText, Settings2 } from 'lucide-react'
import type { ManagedPropertyStatus, ManagedPropertyUpdate } from '@/types/pm'
import {
  useGetPmPropertyDetailQuery,
  useUpdatePmPropertyMutation,
} from '@/features/pm/api/pmApi'
import { formatCurrency } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { MANAGED_PROPERTY_STATUSES } from '@/features/pm/constants'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

type LateFeeType = 'none' | 'fixed' | 'percentage'

const statusVariant = (status?: ManagedPropertyStatus | null) => {
  if (status === 'active') return 'default'
  if (status === 'draft') return 'secondary'
  return 'outline'
}

function parseLateFeePolicy(policy: unknown): {
  type: LateFeeType
  amount: string
  percent: string
} {
  if (!policy || typeof policy !== 'object') {
    return { type: 'none', amount: '', percent: '' }
  }
  const p = policy as Record<string, unknown>
  if (p.type === 'fixed' && typeof p.amount === 'number') {
    return { type: 'fixed', amount: String(p.amount), percent: '' }
  }
  if (p.type === 'percentage' && typeof p.percent === 'number') {
    return { type: 'percentage', amount: '', percent: String(p.percent) }
  }
  if (p.type === 'fixed') {
    return { type: 'fixed', amount: p.amount != null ? String(p.amount) : '', percent: '' }
  }
  if (p.type === 'percentage') {
    return { type: 'percentage', amount: '', percent: p.percent != null ? String(p.percent) : '' }
  }
  return { type: 'none', amount: '', percent: '' }
}

export default function PmPropertyDetailPage() {
  const { propertyId } = useParams()
  const propertyIdNum = Number(propertyId)
  const { toast } = useToast()

  const detail = useGetPmPropertyDetailQuery(propertyIdNum, { skip: !propertyIdNum })
  const [updatePmProperty, updateState] = useUpdatePmPropertyMutation()

  const prop = detail.data?.property
  const activeLease = detail.data?.active_lease

  const [open, setOpen] = useState(false)
  const [managementStatus, setManagementStatus] = useState<ManagedPropertyStatus>('active')
  const [paymentDueDay, setPaymentDueDay] = useState<string>('1')
  const [graceDays, setGraceDays] = useState<string>('5')
  const [lateFeeType, setLateFeeType] = useState<LateFeeType>('none')
  const [lateFeeAmount, setLateFeeAmount] = useState<string>('')
  const [lateFeePercent, setLateFeePercent] = useState<string>('')

  const lateFeePreview = useMemo(() => {
    if (!activeLease?.monthly_rent) return null
    if (lateFeeType === 'fixed') {
      const amount = Number(lateFeeAmount)
      if (!Number.isFinite(amount) || amount < 0) return null
      return `If rent is ${formatCurrency(activeLease.monthly_rent)}, late fee = ${formatCurrency(amount)}`
    }
    if (lateFeeType === 'percentage') {
      const percent = Number(lateFeePercent)
      if (!Number.isFinite(percent) || percent < 0) return null
      const fee = Math.round((activeLease.monthly_rent * percent) / 100)
      return `If rent is ${formatCurrency(activeLease.monthly_rent)}, late fee ≈ ${formatCurrency(fee)} (${percent}%)`
    }
    return null
  }, [activeLease?.monthly_rent, lateFeeType, lateFeeAmount, lateFeePercent])

  const openEdit = () => {
    if (!prop) return
    setManagementStatus((prop.management_status as ManagedPropertyStatus) || 'active')
    setPaymentDueDay(String(prop.payment_due_day ?? 1))
    setGraceDays(String(prop.grace_period_days ?? 5))
    const parsed = parseLateFeePolicy(prop.late_fee_policy)
    setLateFeeType(parsed.type)
    setLateFeeAmount(parsed.amount)
    setLateFeePercent(parsed.percent)
    setOpen(true)
  }

  const submit = async () => {
    if (!prop) return

    const dueDayNum = Number(paymentDueDay)
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 28) {
      toast({ title: 'Invalid due day', description: 'Payment due day must be between 1 and 28.', variant: 'destructive' })
      return
    }
    const graceDaysNum = Number(graceDays)
    if (isNaN(graceDaysNum) || graceDaysNum < 0 || graceDaysNum > 30) {
      toast({ title: 'Invalid grace period', description: 'Grace period must be between 0 and 30 days.', variant: 'destructive' })
      return
    }

    let lateFeePolicy: Record<string, unknown> | null = null
    if (lateFeeType === 'fixed') {
      if (lateFeeAmount.trim() === '') {
        toast({ title: 'Invalid late fee', description: 'Enter a fixed amount.', variant: 'destructive' })
        return
      }
      const amount = Number(lateFeeAmount)
      if (!Number.isFinite(amount) || amount < 0) {
        toast({ title: 'Invalid late fee', description: 'Enter a non-negative fixed amount.', variant: 'destructive' })
        return
      }
      lateFeePolicy = { type: 'fixed', amount }
    } else if (lateFeeType === 'percentage') {
      if (lateFeePercent.trim() === '') {
        toast({ title: 'Invalid late fee', description: 'Enter a percentage of monthly rent.', variant: 'destructive' })
        return
      }
      const percent = Number(lateFeePercent)
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast({ title: 'Invalid late fee', description: 'Enter a percentage between 0 and 100.', variant: 'destructive' })
        return
      }
      lateFeePolicy = { type: 'percentage', percent }
    } else {
      // Empty object matches prior JSON default and clears structured type/amount/percent.
      lateFeePolicy = {}
    }

    const payload: ManagedPropertyUpdate = {
      management_status: managementStatus,
      payment_due_day: dueDayNum,
      grace_period_days: graceDaysNum,
      late_fee_policy: lateFeePolicy,
    }

    try {
      await updatePmProperty({ property_id: prop.id, payload }).unwrap()
      toast({ title: 'Updated', description: 'Property settings updated.' })
      setOpen(false)
    } catch (e: unknown) {
      toast({ title: 'Failed', description: getErrorMessage(e, 'Could not update property.'), variant: 'destructive' })
    }
  }

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
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={openEdit} disabled={!prop} className="rounded-cohere-pill">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit PM Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Management status</Label>
                  <Select value={managementStatus} onValueChange={(v) => setManagementStatus(v as ManagedPropertyStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MANAGED_PROPERTY_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment due day (1-28)</Label>
                  <Input value={paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Grace period days</Label>
                  <Input value={graceDays} onChange={(e) => setGraceDays(e.target.value)} />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div className="space-y-2">
                    <Label>Late fee type</Label>
                    <Select value={lateFeeType} onValueChange={(v) => setLateFeeType(v as LateFeeType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                        <SelectItem value="percentage">Percentage of rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {lateFeeType === 'fixed' && (
                    <div className="space-y-2">
                      <Label htmlFor="late-fee-amount">Fixed amount (₹)</Label>
                      <Input
                        id="late-fee-amount"
                        type="number"
                        min={0}
                        step="1"
                        value={lateFeeAmount}
                        onChange={(e) => setLateFeeAmount(e.target.value)}
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                  {lateFeeType === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="late-fee-percent">Percent of monthly rent</Label>
                      <Input
                        id="late-fee-percent"
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={lateFeePercent}
                        onChange={(e) => setLateFeePercent(e.target.value)}
                        placeholder="e.g. 2"
                      />
                    </div>
                  )}
                  {lateFeePreview ? (
                    <div className="text-xs text-muted-foreground">{lateFeePreview}</div>
                  ) : lateFeeType !== 'none' ? (
                    <div className="text-xs text-muted-foreground">
                      Preview appears when this property has an active lease with rent set.
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => { void submit() }} disabled={updateState.isLoading}>
                  {updateState.isLoading ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  <span className="font-medium">{formatCurrency(activeLease.monthly_rent)}</span>
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

import { useState } from 'react'
import { Download, FileBarChart } from 'lucide-react'
import { downloadCsv } from '@/features/pm/utils'
import { formatCurrency } from '@/lib/format'
import OwnerScopeGate from '@/features/pm/components/OwnerScopeGate'
import { useUserRole } from '@/hooks/useUserRole'
import { useAppSelector } from '@/hooks/redux'
import { selectSelectedOwnerId } from '@/features/pm/slices/pmSlice'
import {
  useGetExpenseReportQuery,
  useGetIncomeReportQuery,
  useGetMaintenanceReportQuery,
  useGetOccupancyReportQuery,
  useGetPnLReportQuery,
  useGetRentRollReportQuery,
  useLazyGetAllRentRollItemsQuery,
} from '@/features/pm/api/pmApi'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import CountUp from '@/components/reactbits/CountUp'
import { PageHeader } from '@/components/ui/page-header'


export default function PmReportsPage() {
  const { role } = useUserRole()
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId)
  const { toast } = useToast()

  const ownerId = selectedOwnerId

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const dateRangeValid = !start || !end || start <= end;

  const [isExporting, setIsExporting] = useState(false)

  // The rent roll is a CursorPage. The card previews the first page; the CSV export reads every page.
  const rentRoll = useGetRentRollReportQuery({ owner_id: ownerId, limit: 100, include_total: true })
  const [loadAllRentRoll] = useLazyGetAllRentRollItemsQuery()
  const income = useGetIncomeReportQuery(
    { owner_id: ownerId, start: start || undefined, end: end || undefined },
    { skip: !dateRangeValid },
  )
  const expenses = useGetExpenseReportQuery(
    { owner_id: ownerId, start: start || undefined, end: end || undefined },
    { skip: !dateRangeValid },
  )
  const pnl = useGetPnLReportQuery(
    { owner_id: ownerId, start: start || undefined, end: end || undefined },
    { skip: !dateRangeValid },
  )
  const occupancy = useGetOccupancyReportQuery({ owner_id: ownerId })
  const maintenance = useGetMaintenanceReportQuery({ owner_id: ownerId })

  const rentRollItems = rentRoll.currentData?.items ?? []

  const exportRentRoll = async () => {
    setIsExporting(true)
    toast({ title: 'Downloading...', description: 'Preparing your export.' })
    try {
      const rows = await loadAllRentRoll({ owner_id: ownerId }).unwrap()
      if (!rows.length) {
        toast({ title: 'Nothing to export', description: 'Rent roll is empty.' })
        return
      }
      downloadCsv(
        `rent_roll_${new Date().toISOString().slice(0, 10)}.csv`,
        rows.map((r) => ({
          property_id: r.property_id,
          title: r.title,
          occupancy: r.occupancy,
          tenant_user_id: r.tenant_user_id,
          monthly_rent: r.monthly_rent,
          lease_end_date: r.lease_end_date,
        })),
      )
      toast({ title: 'Download complete', description: `Exported ${rows.length} rows.` })
    } catch (e: unknown) {
      toast({ title: 'Export failed', description: getErrorMessage(e, 'Could not load the rent roll.'), variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <OwnerScopeGate allowAllOwners>
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="Generate operational reports and export CSV."
          icon={FileBarChart}
          badge={
            role === 'admin'
              ? ownerId
                ? `Owner #${ownerId}`
                : 'All portfolios'
              : ownerId
                ? `Owner #${ownerId}`
                : 'All assigned owners'
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Date range</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-start">Start</Label>
              <Input id="report-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-end">End (inclusive)</Label>
              <Input id="report-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={!dateRangeValid ? 'border-destructive' : ''} />
            </div>
            {!dateRangeValid && <p className="text-xs text-destructive md:col-span-2">End date must be on or after start date</p>}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Income</CardTitle>
            </CardHeader>
            <CardContent>
              {!dateRangeValid ? (
                <EmptyState title="Invalid date range" description="Set an end date on or after the start date." />
              ) : (!income.currentData && income.isFetching) ? (
                <LoadingState type="spinner" />
              ) : income.isError ? (
                <ErrorState title="Failed to load" onRetry={() => void income.refetch()} />
              ) : (
                <>
                  <CountUp
                    to={income.currentData?.total_income ?? 0}
                    duration={1.2}
                    format={(n) => formatCurrency(n)}
                    className="text-2xl font-semibold tracking-tight tabular-nums"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {start || end ? 'Filtered' : 'All time'}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {!dateRangeValid ? (
                <EmptyState title="Invalid date range" description="Set an end date on or after the start date." />
              ) : (!expenses.currentData && expenses.isFetching) ? (
                <LoadingState type="spinner" />
              ) : expenses.isError ? (
                <ErrorState title="Failed to load" onRetry={() => void expenses.refetch()} />
              ) : (
                <>
                  <CountUp
                    to={expenses.currentData?.total_expenses ?? 0}
                    duration={1.2}
                    format={(n) => formatCurrency(n)}
                    className="text-2xl font-semibold tracking-tight tabular-nums"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {start || end ? 'Filtered' : 'All time'}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Net Income (P&amp;L)</CardTitle>
            </CardHeader>
            <CardContent>
              {!dateRangeValid ? (
                <EmptyState title="Invalid date range" description="Set an end date on or after the start date." />
              ) : (!pnl.currentData && pnl.isFetching) ? (
                <LoadingState type="spinner" />
              ) : pnl.isError ? (
                <ErrorState title="Failed to load" onRetry={() => void pnl.refetch()} />
              ) : (
                <>
                  <CountUp
                    to={pnl.currentData?.net_income ?? 0}
                    duration={1.2}
                    format={(n) => formatCurrency(n)}
                    className="text-2xl font-semibold tracking-tight tabular-nums"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Income − Expenses
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(!occupancy.currentData && occupancy.isFetching) ? (
                <LoadingState type="spinner" />
              ) : occupancy.isError ? (
                <ErrorState title="Failed to load" onRetry={() => void occupancy.refetch()} />
              ) : (
                <>
                  <div className="text-sm">Total: <span className="font-medium">{occupancy.currentData?.total ?? 0}</span></div>
                  <div className="text-sm">Occupied: <span className="font-medium">{occupancy.currentData?.occupied ?? 0}</span></div>
                  <div className="text-sm">Vacant: <span className="font-medium">{occupancy.currentData?.vacant ?? 0}</span></div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(!maintenance.currentData && maintenance.isFetching) ? (
                <LoadingState type="spinner" />
              ) : maintenance.isError ? (
                <ErrorState title="Failed to load" onRetry={() => void maintenance.refetch()} />
              ) : (
                <div className="text-sm">Total requests: <span className="font-medium">{maintenance.currentData?.total_requests ?? 0}</span></div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Rent Roll</CardTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => { void exportRentRoll() }}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(!rentRoll.currentData && rentRoll.isFetching) ? (
              <LoadingState type="spinner" />
            ) : rentRoll.isError ? (
              <ErrorState title="Failed to load rent roll" onRetry={() => void rentRoll.refetch()} />
            ) : rentRollItems.length ? (
              <div className="space-y-2">
                {rentRollItems.slice(0, 15).map((r) => (
                  <div key={r.property_id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        Property #{r.property_id} • {r.occupancy}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-medium">{r.monthly_rent ? formatCurrency(r.monthly_rent) : '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.lease_end_date ? `Ends ${formatDate(r.lease_end_date)}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
                {rentRoll.currentData?.has_more || rentRollItems.length > 15 ? (
                  <div className="text-xs text-muted-foreground">
                    Showing first {Math.min(15, rentRollItems.length)} of {rentRoll.currentData?.total ?? rentRollItems.length} rows… export CSV for the full list.
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No rent roll data" />
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerScopeGate>
  )
}

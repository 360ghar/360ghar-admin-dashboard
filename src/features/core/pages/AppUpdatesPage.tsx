import {useState} from 'react'
import { Plus, Edit, Download, Smartphone, Monitor, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import CursorPager from '@/components/ui/cursor-pager'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useGetAppUpdatesQuery, useUpdateAppUpdateMutation } from '@/features/core/api/coreApi'
import type { AppUpdate, AppKey, DevicePlatform } from '@/types/api'
import { APP_KEYS, APP_KEY_LABELS, DEVICE_PLATFORMS, DEVICE_PLATFORM_LABELS, isAppKey, isDevicePlatform } from '@/features/core/constants'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import AppUpdateFormDialog, { type AppUpdateFormData, defaultFormData } from '../components/app-updates/AppUpdateFormDialog'

const AppUpdatesPage: React.FC = () => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterApp, setFilterApp] = useState<AppKey | 'all'>('all')
  const [filterPlatform, setFilterPlatform] = useState<DevicePlatform | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState<AppUpdate | null>(null)
  const [formData, setFormData] = useState<AppUpdateFormData>({ ...defaultFormData })

  // The backend filters by app, platform and is_active. A cursor is bound to those filters, so reset paging when they change.
  const pager = useCursorPagination(`${filterApp}|${filterPlatform}|${filterStatus}`)

  const { currentData: updatesData, isLoading, isFetching, isError, refetch } = useGetAppUpdatesQuery({
    cursor: pager.cursor,
    limit: 20,
    app: filterApp === 'all' ? undefined : filterApp,
    platform: filterPlatform === 'all' ? undefined : filterPlatform,
    is_active: filterStatus === 'all' ? undefined : filterStatus === 'active',
  })
  const [updateUpdate] = useUpdateAppUpdateMutation()

  const filteredUpdates = (updatesData?.items ?? []).filter((update) => {
    // Search runs on the loaded page only. App, platform and status are server filters.
    return update.version.toLowerCase().includes(searchTerm.toLowerCase()) || (update.release_notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleEdit = (update: AppUpdate) => {
    setEditingUpdate(update)
    setFormData({ app: update.app, platform: update.platform, version: update.version, build_number: update.build_number == null ? '' : String(update.build_number), release_notes: update.release_notes ?? '', download_url: update.download_url ?? '', is_mandatory: update.is_mandatory, is_active: update.is_active, min_supported_version: update.min_supported_version ?? '' })
    setIsDialogOpen(true)
  }

  const handleDeactivate = async (update: AppUpdate) => {
    try { await updateUpdate({ id: update.id, data: { is_active: false } }).unwrap(); toast({ title: 'Success', description: 'Update deactivated successfully' }) }
    catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to deactivate'), variant: 'destructive' }) }
  }

  const resetForm = () => { setEditingUpdate(null); setFormData({ ...defaultFormData }) }

  const getPlatformIcon = (platform: string) => {
    switch (platform) { case 'android': return <Smartphone className="h-4 w-4" />; case 'ios': return <Smartphone className="h-4 w-4 rotate-90" />; default: return <Monitor className="h-4 w-4" /> }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Updates"
        description="Manage application updates and versions"
        icon={Smartphone}
        actions={
          <Button className="rounded-cohere-pill" onClick={() => { resetForm(); setIsDialogOpen(true) }}>
            <Plus className="h-4 w-4" />
            New Update
          </Button>
        }
      />
      <Card><CardContent className="pt-6">
        <div className="flex gap-4 flex-wrap">
          <Input placeholder="Search updates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
          <Select value={filterApp} onValueChange={(value) => setFilterApp(value === 'all' ? 'all' : isAppKey(value) ? value : 'all')}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by app" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Apps</SelectItem>{APP_KEYS.map((key) => (<SelectItem key={key} value={key}>{APP_KEY_LABELS[key]}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={filterPlatform} onValueChange={(value) => setFilterPlatform(value === 'all' ? 'all' : isDevicePlatform(value) ? value : 'all')}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by platform" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Platforms</SelectItem>{DEVICE_PLATFORMS.map((key) => (<SelectItem key={key} value={key}>{DEVICE_PLATFORM_LABELS[key]}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </div>
      </CardContent></Card>
      {isLoading || (isFetching && !updatesData) ? <div className="space-y-4"><LoadingState type="card" rows={3} /></div> : isError ? (
        <ErrorState title="Failed to load app updates" onRetry={() => void refetch()} />
      ) : !filteredUpdates.length ? (
        <EmptyState icon={<Monitor className="h-10 w-10" />} title="No updates found" description="Create your first app update entry."
          action={{ label: 'New Update', onClick: () => { resetForm(); setIsDialogOpen(true) } }} />
      ) : (
        <div className="grid gap-4">{filteredUpdates.map((update) => (
          <Card key={update.id}><CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{APP_KEY_LABELS[update.app]}</Badge><Badge variant="outline">v{update.version}</Badge>{update.build_number != null && <Badge variant="outline">Build {update.build_number}</Badge>}
                  {update.is_active ? <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  {update.is_mandatory && <Badge variant="destructive">Mandatory</Badge>}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">{getPlatformIcon(update.platform)}<span className="capitalize">{update.platform}</span></span>
                  {update.min_supported_version && <span>Min Version: {update.min_supported_version}</span>}
                  <span>Created: {formatDate(update.created_at)}</span>
                </div>
                {update.release_notes && <details className="mt-2"><summary className="text-sm font-medium cursor-pointer hover:text-primary">View release notes</summary><div className="mt-2 p-3 bg-muted rounded-md text-sm"><pre className="whitespace-pre-wrap">{update.release_notes}</pre></div></details>}
              </div>
              <div className="flex gap-2">
                {update.download_url && <Button variant="outline" size="sm" onClick={() => window.open(update.download_url ?? undefined, '_blank', 'noopener,noreferrer')} aria-label="Open download link"><Download className="h-4 w-4" /></Button>}
                <Button variant="outline" size="sm" onClick={() => handleEdit(update)}><Edit className="h-4 w-4" /></Button>
                <ConfirmAlertDialog title="Deactivate Update" description="Are you sure you want to deactivate this update?" confirmLabel="Deactivate" variant="destructive" onConfirm={() => handleDeactivate(update)}>
                  {(openDialog) => <Button variant="outline" size="sm" onClick={openDialog}><X className="h-4 w-4" /></Button>}
                </ConfirmAlertDialog>
              </div>
            </div>
          </CardContent></Card>
        ))}</div>
      )}
      <CursorPager
        hasMore={updatesData?.has_more ?? false}
        canPrev={pager.canPrev}
        onNext={() => pager.next(updatesData?.next_cursor ?? null)}
        onPrev={pager.prev}
        loading={isFetching}
      />
      <AppUpdateFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} editingUpdate={editingUpdate} formData={formData} setFormData={setFormData} onSuccess={() => { setEditingUpdate(null); setFormData({ ...defaultFormData }) }} />
    </div>
  )
}

export default AppUpdatesPage

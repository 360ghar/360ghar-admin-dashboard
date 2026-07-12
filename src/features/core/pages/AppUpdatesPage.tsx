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
import type { AppUpdate } from '@/types/api'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import AppUpdateFormDialog, { type AppUpdateFormData, defaultFormData } from '../components/app-updates/AppUpdateFormDialog'

const AppUpdatesPage: React.FC = () => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState<AppUpdate | null>(null)
  const [formData, setFormData] = useState<AppUpdateFormData>({ ...defaultFormData })

  const pager = useCursorPagination(`${filterPlatform}|${filterStatus}`)

  const { data: updatesData, isLoading, isError, refetch } = useGetAppUpdatesQuery({
    cursor: pager.cursor,
    limit: 20})
  const [updateUpdate] = useUpdateAppUpdateMutation()

  const filteredUpdates = (updatesData?.items ?? []).filter((update) => {
    const matchesSearch = update.version.toLowerCase().includes(searchTerm.toLowerCase()) || (update.release_notes || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = filterPlatform === 'all' || update.platform === filterPlatform
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && update.is_active) || (filterStatus === 'inactive' && !update.is_active)
    return matchesSearch && matchesPlatform && matchesStatus
  })

  const handleEdit = (update: AppUpdate) => {
    setEditingUpdate(update)
    setFormData({ platform: update.platform, version: update.version, build_number: String(update.build_number), release_notes: update.release_notes, download_url: update.download_url, is_mandatory: update.is_mandatory, is_active: update.is_active, min_supported_version: update.min_supported_version || '' })
    setIsDialogOpen(true)
  }

  const handleDeactivate = async (update: AppUpdate) => {
    try { await updateUpdate({ id: update.id, data: { is_active: false } }).unwrap(); toast({ title: 'Success', description: 'Update deactivated successfully' }); void refetch() }
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
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by platform" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Platforms</SelectItem><SelectItem value="android">Android</SelectItem><SelectItem value="ios">iOS</SelectItem><SelectItem value="web">Web</SelectItem></SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </div>
      </CardContent></Card>
      {isLoading ? <div className="space-y-4"><LoadingState type="card" rows={3} /></div> : isError ? (
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
                  <Badge variant="outline">v{update.version}</Badge><Badge variant="outline">Build {update.build_number}</Badge>
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
                <Button variant="outline" size="sm" onClick={() => window.open(update.download_url, '_blank')}><Download className="h-4 w-4" /></Button>
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
        loading={isLoading}
      />
      <AppUpdateFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} editingUpdate={editingUpdate} formData={formData} setFormData={setFormData} onSuccess={() => { setEditingUpdate(null); setFormData({ ...defaultFormData }); void refetch() }} />
    </div>
  )
}

export default AppUpdatesPage

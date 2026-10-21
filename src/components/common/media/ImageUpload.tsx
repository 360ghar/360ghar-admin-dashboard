import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { GripVertical, Upload, X } from 'lucide-react'
import { useUploadFileMutation } from '@/features/core/api/uploadApi'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

/** Folders `POST /upload` accepts for a plain image. Property and scene folders need an id and go through presign. */
type UploadFolderType = 'generic' | 'avatar'

type Props = {
  folderType?: UploadFolderType
  value?: string[]
  onChange?: (urls: string[]) => void
  multiple?: boolean
  primary?: string | null
  onPrimaryChange?: (url: string | null) => void
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
}

type AllowedImageType = 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp' | 'image/gif'
type UploadStatus = 'queued' | 'uploading' | 'success' | 'failed' | 'canceled'
type UploadItem = { id: number; file: File; status: UploadStatus; error?: string }
type UploadRun = {
  canceled: boolean
  requests: Set<{ abort: () => void }>
  completed: number
  total: number
  itemIds: Set<number>
}

const allowedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const satisfies readonly AllowedImageType[]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ImageUpload = ({ folderType = 'generic', value = [], onChange, multiple = true, primary = null, onPrimaryChange, onUploadingChange, disabled = false }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const nextItemId = useRef(0)
  const mounted = useRef(true)
  const currentUrls = useRef(value)
  currentUrls.current = value
  const activeRun = useRef<UploadRun | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [uploadFile] = useUploadFileMutation()
  const { toast } = useToast()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const run = activeRun.current
      if (!run) return
      run.canceled = true
      run.requests.forEach((request) => request.abort())
    }
  }, [])

  const pick = () => { if (!disabled) inputRef.current?.click() }
  const remove = (url: string) => {
    if (disabled) return
    const remaining = currentUrls.current.filter((image) => image !== url)
    currentUrls.current = remaining
    onChange?.(remaining)
    if (primary === url) onPrimaryChange?.(remaining[0] ?? null)
  }

  const setItemStatus = (id: number, status: UploadStatus, error?: string) => {
    if (!mounted.current) return
    setItems((previous) => previous.map((item) => item.id === id ? { ...item, status, error } : item))
  }

  const startUploads = async (selected: UploadItem[]) => {
    if (activeRun.current || selected.length === 0) return
    const run: UploadRun = {
      canceled: false,
      requests: new Set(),
      completed: 0,
      total: selected.length,
      itemIds: new Set(selected.map((item) => item.id)),
    }
    activeRun.current = run
    setUploading(true)
    onUploadingChange?.(true)
    setProgress({ done: 0, total: run.total })
    const outcomes: UploadStatus[] = []

    const uploadOne = async (item: UploadItem): Promise<UploadStatus> => {
      setItemStatus(item.id, 'uploading')
      const formData = new FormData()
      formData.append('file', item.file)
      // `folder` is not a field any more: the upload takes `folder_type`. Images shown on public pages must be public.
      formData.append('folder_type', folderType)
      formData.append('visibility', 'public')
      try {
        const request = uploadFile(formData)
        run.requests.add(request)
        try {
          const result = await request.unwrap()
          if (!result.public_url) throw new Error('The upload did not return an image URL.')
          if (!mounted.current) return 'canceled'
          const nextUrls = [...currentUrls.current, result.public_url]
          currentUrls.current = nextUrls
          onChange?.(nextUrls)
          setItemStatus(item.id, 'success')
          return 'success'
        } finally {
          run.requests.delete(request)
        }
      } catch (error: unknown) {
        if (run.canceled) {
          setItemStatus(item.id, 'canceled')
          return 'canceled'
        }
        setItemStatus(item.id, 'failed', getErrorMessage(error, 'Please try again.'))
        return 'failed'
      } finally {
        run.completed += 1
        if (mounted.current) setProgress({ done: run.completed, total: run.total })
      }
    }

    const CONCURRENCY = 3
    for (let index = 0; index < selected.length && !run.canceled; index += CONCURRENCY) {
      outcomes.push(...await Promise.all(selected.slice(index, index + CONCURRENCY).map(uploadOne)))
    }
    if (run.canceled) {
      if (!mounted.current) return
      setItems((previous) => previous.map((item) =>
        run.itemIds.has(item.id) && (item.status === 'queued' || item.status === 'uploading')
          ? { ...item, status: 'canceled' }
          : item,
      ))
    }

    const succeeded = outcomes.filter((status) => status === 'success').length
    const failed = outcomes.filter((status) => status === 'failed').length
    if (!mounted.current) return
    if (run.canceled) {
      toast({ title: 'Upload canceled', description: succeeded ? `${succeeded} image${succeeded > 1 ? 's' : ''} uploaded before cancellation.` : 'No images were uploaded.' })
    } else if (failed === 0) {
      toast({ title: 'Upload complete', description: `${succeeded} image${succeeded > 1 ? 's' : ''} uploaded.` })
    } else if (succeeded > 0) {
      toast({ title: 'Upload partial', description: `${succeeded} of ${selected.length} uploaded. Retry the failed files below.`, variant: 'destructive' })
    } else {
      toast({ title: 'Upload failed', description: 'None of the selected files could be uploaded. Retry below.', variant: 'destructive' })
    }
    activeRun.current = null
    setUploading(false)
    onUploadingChange?.(false)
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const cancelUploads = () => {
    const run = activeRun.current
    if (!run) return
    run.canceled = true
    run.requests.forEach((request) => request.abort())
    setItems((previous) => previous.map((item) =>
      run.itemIds.has(item.id) && (item.status === 'queued' || item.status === 'uploading')
        ? { ...item, status: 'canceled' }
        : item,
    ))
  }

  const onFiles = (files: FileList | null) => {
    if (!files || disabled) return
    const valid: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(files)) {
      if (!allowedImageTypes.includes(file.type as AllowedImageType)) {
        rejected.push(`${file.name}: unsupported type`)
      } else if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: larger than 10 MB`)
      } else {
        valid.push(file)
      }
    }

    if (rejected.length) {
      toast({ title: 'Some files were skipped', description: rejected.join('; '), variant: 'destructive' })
    }
    if (!valid.length) {
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const selected = valid.map((file): UploadItem => ({ id: nextItemId.current++, file, status: 'queued' }))
    // Finished uploads leave the list when the next batch starts, so Files and rows do not pile up.
    setItems((previous) => [...previous.filter((item) => item.status !== 'success'), ...selected])
    void startUploads(selected)
  }

  const retry = (item: UploadItem) => {
    if (disabled || activeRun.current || (item.status !== 'failed' && item.status !== 'canceled')) return
    setItemStatus(item.id, 'queued')
    void startUploads([item])
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const onDragStart = (idx: number) => { if (!disabled) setDragIndex(idx) }
  const onDragOver = (e: React.DragEvent) => e.preventDefault()
  const moveImage = (from: number, to: number) => {
    if (disabled || from < 0 || to < 0 || from >= value.length || to >= value.length || from === to) return
    const reordered = [...value]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onChange?.(reordered)
    onPrimaryChange?.(reordered[0])
  }
  const onDrop = (idx: number) => {
    if (dragIndex !== null) moveImage(dragIndex, idx)
    setDragIndex(null)
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {value?.map((url, idx) => (
          <div
            key={url}
            className={`relative h-28 w-28 overflow-hidden rounded-cohere-sm border transition-transform ${dragIndex === idx ? 'ring-2 ring-ring scale-105' : ''}`}
            onDragOver={onDragOver}
            onDrop={() => onDrop(idx)}
          >
            <img src={url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
            <div className="absolute inset-x-1 top-1 flex items-start justify-between gap-1">
              <Button
                type="button"
                size="sm"
                variant={primary === url ? 'default' : 'secondary'}
                className="h-8 min-w-0 px-1 text-[10px]"
                onClick={() => { if (!disabled) onPrimaryChange?.(url) }}
                disabled={disabled}
                aria-label={primary === url ? `Primary image ${idx + 1}` : `Make image ${idx + 1} primary`}
              >
                {primary === url ? 'Primary' : 'Set primary'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 w-8 shrink-0 p-0"
                onClick={() => remove(url)}
                disabled={disabled}
                aria-label={`Remove image ${idx + 1}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute bottom-1 left-1 h-8 w-8 p-0"
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnd={() => setDragIndex(null)}
              onKeyDown={(event) => {
                if (disabled) return
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveImage(idx, idx - 1)
                } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveImage(idx, idx + 1)
                }
              }}
              title="Drag or use arrow keys to reorder"
              aria-label={`Reorder image ${idx + 1} of ${value.length}; use arrow keys`}
              disabled={disabled}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={pick} disabled={disabled || uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload Images'}
          </Button>
          {uploading && (
            <Button type="button" variant="outline" onClick={cancelUploads} disabled={disabled || activeRun.current?.canceled}>
              {activeRun.current?.canceled ? 'Canceling…' : 'Cancel upload'}
            </Button>
          )}
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF · up to 10 MB each</span>
          <input
            ref={inputRef}
            type="file"
            disabled={disabled}
            accept={allowedImageTypes.join(',')}
            multiple={multiple}
            className="hidden"
            onChange={(e) => { void onFiles(e.target.files) }}
          />
        </div>
        {progress && (
          <div className="space-y-1">
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">Processed {progress.done} of {progress.total} files…</p>
          </div>
        )}
        {items.length > 0 && (
          <ul aria-label="Image upload status" aria-live="polite" className="space-y-1 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2">
                <span className="min-w-0 flex-1 truncate" title={item.file.name}>{item.file.name}</span>
                <span className={item.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
                  {item.status === 'queued' ? 'Queued' : item.status === 'uploading' ? 'Uploading' : item.status === 'success' ? 'Uploaded' : item.status === 'failed' ? 'Failed' : 'Canceled'}
                </span>
                {(item.status === 'failed' || item.status === 'canceled') && (
                  <Button type="button" size="sm" variant="outline" onClick={() => retry(item)} disabled={disabled || uploading} aria-label={`Retry ${item.file.name}`}>Retry</Button>
                )}
                {item.error && <p className="w-full text-xs text-destructive">{item.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default ImageUpload

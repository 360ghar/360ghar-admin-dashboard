import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { GripVertical, Upload, X } from 'lucide-react'
import { useUploadFileMutation } from '@/features/core/api/uploadApi'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

type Props = {
  folder?: string
  value?: string[]
  onChange?: (urls: string[]) => void
  multiple?: boolean
  primary?: string | null
  onPrimaryChange?: (url: string) => void
}

type AllowedImageType = 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp' | 'image/gif'

const allowedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const satisfies readonly AllowedImageType[]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ImageUpload = ({ folder = 'properties', value = [], onChange, multiple = true, primary = null, onPrimaryChange }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [uploadFile] = useUploadFileMutation()
  const { toast } = useToast()

  const pick = () => inputRef.current?.click()
  const remove = (url: string) => onChange?.(value.filter((u) => u !== url))

  const onFiles = async (files: FileList | null) => {
    if (!files) return
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

    setUploading(true)
    setProgress({ done: 0, total: valid.length })
    const urls: string[] = []
    const CONCURRENCY = 3
    try {
      const uploadOne = async (file: File): Promise<string | null> => {
        const fd = new FormData()
        fd.append('file', file)
        if (folder) fd.append('folder', folder)
        try {
          const res = await uploadFile(fd).unwrap()
          return res.public_url
        } catch {
          return null
        }
      }

      // Upload batches of CONCURRENCY at a time so large batches don't starve
      // the network, but partial failures within a batch don't discard files
      // that already made it to storage.
      for (let i = 0; i < valid.length; i += CONCURRENCY) {
        const batch = valid.slice(i, i + CONCURRENCY)
        const results = await Promise.all(batch.map(uploadOne))
        for (const url of results) {
          if (url) urls.push(url)
        }
        setProgress({ done: urls.length, total: valid.length })
      }
    } catch (e: unknown) {
      toast({
        title: 'Upload failed',
        description: getErrorMessage(e, 'Please try again or check your connection.'),
        variant: 'destructive',
      })
    } finally {
      // Always commit whatever uploaded successfully so a mid-batch failure
      // doesn't discard (and orphan) files that already made it to storage.
      if (urls.length) onChange?.([...(value || []), ...urls])
      if (urls.length === valid.length) {
        toast({ title: 'Upload complete', description: `${urls.length} image${urls.length > 1 ? 's' : ''} uploaded.` })
      } else if (urls.length > 0) {
        toast({ title: 'Upload partial', description: `${urls.length} of ${valid.length} uploaded. Some files failed.`, variant: 'destructive' })
      } else {
        toast({ title: 'Upload failed', description: 'None of the selected files could be uploaded. Please try again.', variant: 'destructive' })
      }
      setUploading(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  // Drag & drop reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const onDragStart = (idx: number) => setDragIndex(idx)
  const onDragOver = (e: React.DragEvent) => e.preventDefault()
  const onDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) return setDragIndex(null)
    const arr = [...(value || [])]
    const [moved] = arr.splice(dragIndex, 1)
    arr.splice(idx, 0, moved)
    onChange?.(arr)
    if (arr.length && onPrimaryChange) onPrimaryChange(arr[0])
    setDragIndex(null)
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {value?.map((url, idx) => (
          <div
            key={url}
            className={`relative h-24 w-24 overflow-hidden rounded-cohere-sm border transition-transform ${dragIndex === idx ? 'ring-2 ring-ring scale-105' : ''}`}
            onDragOver={onDragOver}
            onDrop={() => onDrop(idx)}
          >
            <img src={url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
            <div className="absolute left-1 top-1 flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={primary === url ? 'default' : 'secondary'}
                className="h-6 px-2 text-xs"
                onClick={() => onPrimaryChange?.(url)}
              >
                {primary === url ? 'Primary' : 'Make Primary'}
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute bottom-1 left-1 h-6 w-6 p-0"
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnd={() => setDragIndex(null)}
              title="Drag to reorder"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute right-1 top-1 h-6 w-6 p-0"
              onClick={() => remove(url)}
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={pick} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload Images'}
          </Button>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF · up to 10 MB each</span>
          <input
            ref={inputRef}
            type="file"
            accept={allowedImageTypes.join(',')}
            multiple={multiple}
            className="hidden"
            onChange={(e) => { void onFiles(e.target.files) }}
          />
        </div>
        {progress && (
          <div className="space-y-1">
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">Uploading {progress.done} of {progress.total}…</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageUpload

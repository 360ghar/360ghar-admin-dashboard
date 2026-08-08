import { toast } from '@/hooks/use-toast'

/** Rejects (with a toast) a file over `maxMb`. Returns whether the file is within the limit. */
export function validateFileSize(file: File | null, maxMb: number): boolean {
  if (file && file.size > maxMb * 1024 * 1024) {
    toast({ title: 'File too large', description: `Maximum file size is ${maxMb} MB.`, variant: 'destructive' })
    return false
  }
  return true
}

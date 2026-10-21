import { LoadingState } from '@/components/ui/loading-state'

interface PageLoadingProps {
  rows?: number
  type?: 'card' | 'spinner'
  fullScreen?: boolean
}

export function PageLoading({ rows = 5, type = 'card', fullScreen = true }: PageLoadingProps) {
  return (
    <div className={fullScreen ? 'flex min-h-screen items-center justify-center' : 'w-full'}>
      <LoadingState type={type} rows={rows} className={fullScreen ? 'w-full max-w-2xl' : 'w-full'} />
    </div>
  )
}

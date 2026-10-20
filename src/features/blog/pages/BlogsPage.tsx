import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText, Plus, Folder, Tag, Sparkles, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import FadeContent from '@/components/reactbits/FadeContent'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { LoadingState } from '@/components/ui/loading-state'
import BlogList from '../components/BlogList'

const BlogEditor = lazy(() => import('../components/BlogEditor'))
const BlogEdit = lazy(() => import('../components/BlogEdit'))
const BlogDetail = lazy(() => import('../components/BlogDetail'))
const BlogGenerateDialog = lazy(() => import('../components/BlogGenerateDialog'))

type Props = { mode?: 'create' | 'detail' | 'edit' }

const BlogsPage = ({ mode }: Props) => {
  const params = useParams()
  const navigate = useNavigate()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)

  if (mode === 'create') {
    return <Suspense fallback={<LoadingState type="card" rows={5} />}><BlogEditor onSuccess={(slug) => navigate(`/blogs/${slug}`)} /></Suspense>
  }
  if (mode === 'detail') {
    const identifier = params.identifier as string
    return <Suspense fallback={<LoadingState type="card" rows={5} />}><BlogDetail identifier={identifier} /></Suspense>
  }
  if (mode === 'edit') {
    const identifier = params.identifier as string
    return <Suspense fallback={<LoadingState type="card" rows={5} />}><BlogEdit key={identifier} identifier={identifier} onSuccess={(slug) => navigate(`/blogs/${slug}`)} /></Suspense>
  }

  const quickManagementCards = (
    <div className="grid gap-6 md:grid-cols-2">
      <Link to="/blogs/categories" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className="p-6 transition-colors hover:border-cohere-hairline">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-cohere-coral" />
                <h3 className="text-lg font-semibold">Categories</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Organize blog content with categories
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </Link>

      <Link to="/blogs/tags" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className="p-6 transition-colors hover:border-cohere-hairline">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-cohere-action-blue" />
                <h3 className="text-lg font-semibold">Tags</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Label content with descriptive tags
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </Link>
    </div>
  )

  return (
    <ErrorBoundary>
      {isGenerateOpen && (
        <Suspense fallback={<LoadingState type="card" rows={3} />}>
          <BlogGenerateDialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen} />
        </Suspense>
      )}
      <div className="space-y-8">
        <PageHeader
          title="Blog Posts"
          description="Manage and publish blog content for the 360Ghar platform"
          icon={FileText}
          badge="Admin View"
          actions={
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setIsGenerateOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Button>
              <Button asChild className="gap-2">
                <Link to="/blogs/new">
                  <Plus className="h-4 w-4" />
                  New Post
                </Link>
              </Button>
            </div>
          }
        />

        {/* Quick Management Cards */}
        {prefersReducedMotion ? (
          quickManagementCards
        ) : (
          <FadeContent container="#main-content" threshold={0} duration={600}>
            {quickManagementCards}
          </FadeContent>
        )}

        <BlogList />
      </div>
    </ErrorBoundary>
  )
}

export default BlogsPage

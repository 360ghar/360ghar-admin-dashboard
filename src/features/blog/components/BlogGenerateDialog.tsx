import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  useGenerateBlogFromTopicMutation,
  useGenerateBulkBlogsMutation,
} from '@/features/blog/api/blogsApi'
import type { BlogGenerationResult } from '@/types/blog'
import { Sparkles, ListOrdered } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

interface BlogGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const BlogGenerateDialog = ({ open, onOpenChange }: BlogGenerateDialogProps) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(3)
  const [results, setResults] = useState<BlogGenerationResult[]>([])

  const [generateFromTopic, { isLoading: isGeneratingSingle }] = useGenerateBlogFromTopicMutation()
  const [generateBulk, { isLoading: isGeneratingBulk }] = useGenerateBulkBlogsMutation()

  const isGenerating = isGeneratingSingle || isGeneratingBulk

  const handleModeChange = (nextMode: 'single' | 'bulk') => {
    setMode(nextMode)
    setResults([])
    setTopic('')
    setCount(3)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (mode === 'single') {
        if (!topic.trim()) {
          toast({
            title: 'Topic required',
            description: 'Please enter a topic for the blog post.',
            variant: 'destructive',
          })
          return
        }
        const res = await generateFromTopic({ topic: topic.trim() }).unwrap()
        setResults([res])
        toast({
          title: 'Draft generated',
          description: 'A new draft blog post has been created.',
        })
      } else {
        const safeCount = Math.min(Math.max(count || 1, 1), 20)
        const res = await generateBulk({ count: safeCount }).unwrap()
        setResults(res)
        toast({
          title: 'Drafts generated',
          description: `${res.length} draft blog ${res.length === 1 ? 'post' : 'posts'} have been created.`,
        })
      }
    } catch (error: unknown) {
      toast({
        title: 'Generation failed',
        description: getErrorMessage(error, 'Unable to generate blog content. Please try again.'),
        variant: 'destructive',
      })
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTopic('')
      setCount(3)
      setResults([])
      setMode('single')
    }
    onOpenChange(nextOpen)
  }

  const handleOpenEditor = (slug: string) => {
    onOpenChange(false)
    navigate(`/blogs/${slug}/edit`)
  }

  const handleViewPost = (slug: string) => {
    onOpenChange(false)
    navigate(`/blogs/${slug}`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate blog posts with AI</DialogTitle>
          <DialogDescription>
            Use AI to create SEO-optimised draft posts about Gurgaon real estate, then review and publish them.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex rounded-cohere-pill border border-cohere-card-border bg-card/40 p-1 text-xs backdrop-blur-md">
              <Button
                type="button"
                size="sm"
                variant={mode === 'single' ? 'default' : 'ghost'}
                className="gap-2"
                onClick={() => handleModeChange('single')}
              >
                <Sparkles className="h-4 w-4" />
                Single topic
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'bulk' ? 'default' : 'ghost'}
                className="gap-2"
                onClick={() => handleModeChange('bulk')}
              >
                <ListOrdered className="h-4 w-4" />
                Bulk plan
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Drafts are saved automatically as <span className="font-medium">unpublished</span> posts.
            </div>
          </div>

          {mode === 'single' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <Input
                placeholder="e.g. Best residential societies in Gurgaon for young families"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Describe the blog you want. The system will research and generate a full draft focused on Gurgaon real estate.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of posts</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => {
                    const value = Number(e.target.value || 1)
                    const clamped = Math.min(Math.max(value, 1), 20)
                    setCount(clamped)
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Generate a mini content plan with diverse Gurgaon real estate topics (max 20 at a time).
                </p>
              </div>
              <div className="text-xs text-muted-foreground md:text-right">
                Topics are auto-generated across buying, renting, investment, neighbourhoods, and legal updates.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isGenerating || (mode === 'single' && !topic.trim())}>
              {isGenerating ? 'Generating…' : mode === 'single' ? 'Generate draft' : 'Generate drafts'}
            </Button>
          </div>
        </form>

        {results.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="text-sm font-medium">Generated drafts</div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {results.map((res) => (
                <Card key={res.blog.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="text-base line-clamp-2">{res.blog.title}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          Draft
                        </Badge>
                        <span>
                          Created{' '}
                          {res.blog.created_at
                            ? formatDateTime(res.blog.created_at)
                            : 'just now'}
                        </span>
                      </div>
                    </div>
                    {res.images?.[0] && (
                      <img
                        src={res.images[0]}
                        alt={res.blog.title}
                        className="hidden md:block h-16 w-24 rounded object-cover"
                      />
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {res.blog.excerpt || 'Review the content and then publish when ready.'}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPost(res.blog.slug)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenEditor(res.blog.slug)}
                      >
                        Edit &amp; publish
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BlogGenerateDialog


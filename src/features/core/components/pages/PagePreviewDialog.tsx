import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SanitizedHtml } from '@/components/ui/sanitized-html'

interface PagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string
  uniqueName: string
  format: string
}

const PagePreviewDialog: React.FC<PagePreviewDialogProps> = ({ open, onOpenChange, title, content, uniqueName, format }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview: {title}</DialogTitle>
          <DialogDescription>This is how your page will appear to users</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="prose max-w-none">
            <h1>{title}</h1>
            {format === 'json'
              ? <pre className="whitespace-pre-wrap text-sm">{content}</pre>
              : <SanitizedHtml html={content} />}
          </div>
          <Alert>
            <AlertDescription>
              <strong>Details:</strong>{'\n'}Unique Name: {uniqueName}{'\n'}Format: {format}
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close Preview</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PagePreviewDialog

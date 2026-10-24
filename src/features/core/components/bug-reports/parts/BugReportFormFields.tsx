import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Paperclip, Image, Video, FileText, X } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { BugReportFormData } from '@/features/core/validations'

interface BugReportFormFieldsProps {
  form: UseFormReturn<BugReportFormData>
  attachments: File[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  removeAttachment: (index: number) => void
}

const BugReportFormFields: React.FC<BugReportFormFieldsProps> = ({ form, attachments, fileInputRef, handleFileSelect, removeAttachment }) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2"><Label>Source</Label><Controller control={form.control} name="source" render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="web">Web</SelectItem><SelectItem value="mobile">Mobile</SelectItem><SelectItem value="api">API</SelectItem></SelectContent></Select>)} /></div>
      <div className="space-y-2"><Label>Bug Type</Label><Controller control={form.control} name="bug_type" render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ui_bug">UI Bug</SelectItem><SelectItem value="functionality_bug">Functionality Bug</SelectItem><SelectItem value="performance_issue">Performance Issue</SelectItem><SelectItem value="crash">Crash</SelectItem><SelectItem value="feature_request">Feature Request</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>)} /></div>
      <div className="space-y-2"><Label>Severity</Label><Controller control={form.control} name="severity" render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>)} /></div>
    </div>
    <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" {...form.register('title')} placeholder="Brief description of the issue" /></div>
    <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" {...form.register('description')} placeholder="Detailed description of the issue" rows={4} /></div>
    <div className="space-y-2"><Label htmlFor="steps_to_reproduce">Steps to Reproduce</Label><Textarea id="steps_to_reproduce" {...form.register('steps_to_reproduce')} placeholder="1. Step one&#10;2. Step two&#10;3. Step three" rows={4} /></div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="expected_behavior">Expected Behavior</Label><Textarea id="expected_behavior" {...form.register('expected_behavior')} placeholder="What should have happened?" rows={3} /></div>
      <div className="space-y-2"><Label htmlFor="actual_behavior">Actual Behavior</Label><Textarea id="actual_behavior" {...form.register('actual_behavior')} placeholder="What actually happened?" rows={3} /></div>
    </div>
    <div className="space-y-4">
      <Label className="text-base">Device Information (Optional)</Label>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="os">Operating System</Label><Input id="os" {...form.register('device_info.os')} placeholder="e.g., Windows 10, iOS 15.0" /></div>
        <div className="space-y-2"><Label htmlFor="browser">Browser</Label><Input id="browser" {...form.register('device_info.browser')} placeholder="e.g., Chrome 96.0, Safari 15.0" /></div>
      </div>
    </div>
    <div className="space-y-2">
      <Label>Attachments (Optional)</Label>
      <div className="border-2 border-dashed border-border rounded-lg p-4">
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
        <div className="text-center">
          <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">Drag and drop files here or click to browse</p>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Choose Files</Button>
        </div>
      </div>
      {attachments.length > 0 && (
        <div className="space-y-2"><Label>Selected Files</Label><div className="space-y-2">{attachments.map((file, index) => (
          <div key={index} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              {file.type.startsWith('image/') ? <Image className="h-5 w-5 text-blue-500" /> : file.type.startsWith('video/') ? <Video className="h-5 w-5 text-green-500" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm truncate">{file.name}</span><span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)}KB</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}><X className="h-4 w-4" /></Button>
          </div>
        ))}</div></div>
      )}
    </div>
  </div>
)

export default BugReportFormFields

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserRound } from 'lucide-react'
import { useCreateAgentMutation, useGetAgentQuery, useUpdateAgentMutation } from '@/features/agents/api/agentsApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'
import { PageHeader } from '@/components/ui/page-header'
import { getErrorMessage } from '@/lib/errors'
import { applyServerValidation } from '@/lib/formErrors'
import { agentFormSchema, type AgentFormValues } from '@/features/agents/validations'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'

const AgentForm = ({ id }: { id?: number }) => {
  const isEdit = id != null && !Number.isNaN(id)
  const invalidEditId = id != null && Number.isNaN(id)
  const { data, isLoading, error, refetch } = useGetAgentQuery(id!, { skip: !isEdit })
  const [create, createState] = useCreateAgentMutation()
  const [update, updateState] = useUpdateAgentMutation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: '',
      contact_number: '',
      description: '',
      languages: '',
      agent_type: 'general',
      experience_level: 'intermediate',
      is_active: true,
      is_available: true,
    },
  })

  useEffect(() => {
    if (data) {
      const agent = data
      form.reset({
        name: agent.name || '',
        contact_number: agent.contact_number || '',
        description: agent.description || '',
        languages: (agent.languages || []).join(', '),
        agent_type: agent.agent_type || 'general',
        experience_level: agent.experience_level || 'intermediate',
        is_active: agent.is_active ?? true,
        is_available: agent.is_available ?? true,
      })
    }
  }, [data, form])

  const onSubmit = async (values: AgentFormValues) => {
    form.clearErrors()
    const parsedLanguages = values.languages
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    try {
      if (isEdit && id) {
        await update({
          id,
          data: {
            name: values.name,
            contact_number: values.contact_number || undefined,
            description: values.description || undefined,
            languages: parsedLanguages,
            agent_type: values.agent_type,
            experience_level: values.experience_level,
            is_active: values.is_active,
            is_available: values.is_available,
          },
        }).unwrap()
        toast({ title: 'Saved', description: 'Agent updated' })
      } else {
        await create({
          name: values.name,
          contact_number: values.contact_number || undefined,
          description: values.description || undefined,
          languages: parsedLanguages,
          agent_type: values.agent_type,
          experience_level: values.experience_level,
        }).unwrap()
        toast({ title: 'Created', description: 'Agent created' })
      }
      navigate('/agents')
    } catch (e: unknown) {
      applyServerValidation(e, form.setError, {
        knownFields: [
          'name',
          'contact_number',
          'description',
          'languages',
          'agent_type',
          'experience_level',
          'is_active',
          'is_available',
        ],
      })
      toast({ title: 'Failed', description: getErrorMessage(e, 'Try again'), variant: 'destructive' })
    }
  }

  if (invalidEditId) {
    return (
      <EmptyState
        title="Invalid agent id"
        description="The URL does not contain a valid agent identifier."
        action={{ label: 'Back to agents', onClick: () => navigate('/agents'), variant: 'outline' }}
      />
    )
  }

  if (isEdit && error) {
    return (
      <ErrorState
        title="Failed to load agent"
        error={error}
        onRetry={() => { void refetch() }}
      />
    )
  }

  if (isEdit && isLoading) {
    return <LoadingState type="card" rows={6} />
  }

  if (isEdit && !isLoading && !data) {
    return (
      <EmptyState
        title="Agent not found"
        description="This agent may have been removed."
        action={{ label: 'Back to agents', onClick: () => navigate('/agents'), variant: 'outline' }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={isEdit ? 'Edit Agent' : 'Create Agent'}
        description={isEdit ? 'Update agent details and availability.' : 'Add a new agent to the system.'}
        icon={UserRound}
      />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4 md:grid-cols-2">
              <FormRootError form={form} className="md:col-span-2" />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="languages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Languages</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="english, hindi" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agent_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="specialist">Specialist</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experience_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEdit && (
                <>
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Active</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_available"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/agents')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
                  {isEdit ? (updateState.isLoading ? 'Saving…' : 'Save') : createState.isLoading ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AgentForm

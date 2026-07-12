import { z } from 'zod'

const toBool = (v: unknown) => (v === 'true' ? true : v === 'false' ? false : v)

// Agent form validation schema
export const agentFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact_number: z.string().optional(),
  description: z.string().optional(),
  languages: z.string().optional(),
  agent_type: z.enum(['general', 'specialist', 'senior'], {
    required_error: 'Agent type is required',
  }),
  experience_level: z.enum(['beginner', 'intermediate', 'expert'], {
    required_error: 'Experience level is required',
  }),
  is_active: z.preprocess(toBool, z.boolean().optional()),
  is_available: z.preprocess(toBool, z.boolean().optional()),
})

// Export inferred types
export type AgentFormValues = z.infer<typeof agentFormSchema>

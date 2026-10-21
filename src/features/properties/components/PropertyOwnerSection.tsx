import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Combobox from '@/components/ui/combobox'
import type { UseFormReturn } from 'react-hook-form'
import type { PropertyFormValues } from '@/features/properties/validations'

interface PropertyOwnerSectionProps {
  form: UseFormReturn<PropertyFormValues>
  ownerMode: 'search' | 'id'
  setOwnerMode: (mode: 'search' | 'id') => void
  ownerSearch: string
  setOwnerSearch: (value: string) => void
  users: { data?: { items?: Array<{ id: number; full_name?: string | null; phone?: string | null }> } }
  role: string
  disabled?: boolean
}

const PropertyOwnerSection: React.FC<PropertyOwnerSectionProps> = ({
  form, ownerMode, setOwnerMode, ownerSearch, setOwnerSearch, users, role, disabled = false,
}) => {
  if (role !== 'admin' && role !== 'agent') return null

  return (
    <div className="md:col-span-2 grid gap-2">
      <FormLabel>Owner Selection</FormLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <FormLabel className="text-xs text-muted-foreground">Mode</FormLabel>
          <Select disabled={disabled} value={ownerMode} onValueChange={(v) => { if (!disabled) setOwnerMode(v as 'id' | 'search') }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="search">Search Users</SelectItem>
              <SelectItem value="id">Enter User ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {ownerMode === 'search' && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <FormLabel className="text-xs text-muted-foreground">Search</FormLabel>
              <Input disabled={disabled} placeholder="Search users by name or phone" value={ownerSearch} onChange={(e) => setOwnerSearch(e.target.value)} />
            </div>
            <FormField control={form.control} name="owner_id" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Select User</FormLabel>
                <FormControl>
                  <Combobox
                    items={(users.data?.items || []).map((u) => ({ value: String(u.id), label: `${u.full_name || 'User'} • ${u.phone || 'N/A'} • #${u.id}` }))}
                    value={field.value ? String(field.value) : ''} disabled={disabled} onChange={(v) => { if (!disabled) field.onChange(v ? Number(v) : undefined) }}
                  />
                </FormControl><FormMessage />
              </FormItem>
            )} />
          </div>
        )}
        {ownerMode === 'id' && (
          <FormField control={form.control} name="owner_id" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Owner ID</FormLabel>
              <FormControl>
                <Input type="number" disabled={disabled} placeholder="e.g. 123" value={field.value ? String(field.value) : ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
              </FormControl><FormMessage />
            </FormItem>
          )} />
        )}
      </div>
    </div>
  )
}

export default PropertyOwnerSection

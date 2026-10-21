import type { ApplicationFieldType, CustomField } from '@/types/pm'

/** One question row of the application form editor. `options` holds the choices of a choice list, one per line. */
export interface FieldRow {
  key: number
  label: string
  field_type: ApplicationFieldType
  is_required: boolean
  options: string
}

export const emptyFieldRow = (key: number): FieldRow => ({
  key,
  label: '',
  field_type: 'text',
  is_required: false,
  options: '',
})

/** The backend keys answers by field id (1 to 64 characters). Build a readable, unique id from the label. */
function fieldId(label: string, index: number, taken: Set<string>): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 56) || `field_${index + 1}`
  let id = base
  for (let n = 2; taken.has(id); n += 1) id = `${base}_${n}`
  taken.add(id)
  return id
}

/** The `custom_fields` of the create body, or an error message when a row is incomplete. */
export function buildCustomFields(rows: FieldRow[]): { fields: CustomField[] } | { error: string } {
  const taken = new Set<string>()
  const fields: CustomField[] = []
  for (const [index, row] of rows.entries()) {
    const label = row.label.trim()
    if (!label) return { error: `Question ${index + 1} needs a label.` }
    const options = row.options.split('\n').map((o) => o.trim()).filter(Boolean)
    if (row.field_type === 'select' && options.length === 0) {
      return { error: `Question ${index + 1} is a choice list. Add at least one choice.` }
    }
    fields.push({
      id: fieldId(label, index, taken),
      label: label.slice(0, 200),
      field_type: row.field_type,
      is_required: row.is_required,
      options: row.field_type === 'select' ? options : undefined,
    })
  }
  return { fields }
}

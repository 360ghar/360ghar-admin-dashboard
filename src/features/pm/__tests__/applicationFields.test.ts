import { describe, expect, it } from 'vitest'
import { buildCustomFields, emptyFieldRow } from '../applicationFields'

describe('buildCustomFields', () => {
  it('builds unique readable ids from the labels', () => {
    const result = buildCustomFields([
      { ...emptyFieldRow(1), label: 'Current employer' },
      { ...emptyFieldRow(2), label: 'Current employer', is_required: true },
      { ...emptyFieldRow(3), label: '!!!' },
    ])
    expect(result).toEqual({
      fields: [
        { id: 'current_employer', label: 'Current employer', field_type: 'text', is_required: false, options: undefined },
        { id: 'current_employer_2', label: 'Current employer', field_type: 'text', is_required: true, options: undefined },
        { id: 'field_3', label: '!!!', field_type: 'text', is_required: false, options: undefined },
      ],
    })
  })

  it('needs a label and, for a choice list, at least one choice', () => {
    expect(buildCustomFields([emptyFieldRow(1)])).toEqual({ error: 'Question 1 needs a label.' })
    expect(buildCustomFields([{ ...emptyFieldRow(1), label: 'Pets', field_type: 'select' }])).toMatchObject({
      error: expect.stringContaining('choice list') as string,
    })
  })

  it('keeps the choices of a choice list only', () => {
    const result = buildCustomFields([
      { ...emptyFieldRow(1), label: 'Pets', field_type: 'select', options: 'Dog\n \nCat' },
      { ...emptyFieldRow(2), label: 'Note', field_type: 'textarea', options: 'ignored' },
    ])
    expect(result).toMatchObject({ fields: [{ options: ['Dog', 'Cat'] }, { options: undefined }] })
  })

  it('has no question when the list is empty', () => {
    expect(buildCustomFields([])).toEqual({ fields: [] })
  })
})

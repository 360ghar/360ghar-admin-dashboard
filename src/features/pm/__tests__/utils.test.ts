import { describe, expect, it } from 'vitest'
import { getOwnerLabel, monthToFirstDay } from '../utils'

describe('getOwnerLabel', () => {
  it('uses the name', () => {
    expect(getOwnerLabel({ id: 4, full_name: ' Asha Rao ' })).toBe('Asha Rao')
  })

  it('never falls back to a phone or email: the label is saved in local storage', () => {
    expect(getOwnerLabel({ id: 4, full_name: null })).toBe('Owner #4')
    expect(getOwnerLabel({ id: 4, full_name: '  ' })).toBe('Owner #4')
  })
})

describe('monthToFirstDay', () => {
  it('turns an HTML month into the first day of the month', () => {
    expect(monthToFirstDay('2026-10')).toBe('2026-10-01')
    expect(monthToFirstDay('2026-02')).toBe('2026-02-01')
  })
})

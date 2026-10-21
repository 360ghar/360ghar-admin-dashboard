import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from '../fetchAllPages'

const page = (items: number[], has_more: boolean, next_cursor: string | null) => ({ data: { items, has_more, next_cursor } })

describe('fetchAllPages', () => {
  it('follows next_cursor and joins every page', async () => {
    const baseQuery = vi.fn()
      .mockResolvedValueOnce(page([1], true, 'a'))
      .mockResolvedValueOnce(page([2], false, null))
    const result = await fetchAllPages<number>(baseQuery, '/x')
    expect(result).toEqual({ data: [1, 2] })
    expect(baseQuery.mock.calls[1][0]).toMatchObject({ params: { cursor: 'a' } })
  })

  it('fails when has_more is true without a cursor', async () => {
    const result = await fetchAllPages<number>(vi.fn().mockResolvedValue(page([1], true, null)), '/x')
    expect(result.error).toBeDefined()
  })

  it('fails when the page cap is reached', async () => {
    const result = await fetchAllPages<number>(vi.fn().mockResolvedValue(page([1], true, 'next')), '/x')
    expect(result.error).toBeDefined()
  })
})

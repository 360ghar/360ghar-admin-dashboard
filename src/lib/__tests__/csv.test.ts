import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { downloadCsv, csvFilename } from '@/lib/csv'

/** jsdom's Blob has no `.text()` — read it via FileReader. */
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

describe('downloadCsv', () => {
  const captured: Blob[] = []

  beforeEach(() => {
    captured.length = 0
    // jsdom's URL lacks createObjectURL/revokeObjectURL (Node's has them), so
    // install stubs on the global; the Record cast keeps the linter quiet.
    ;(URL as unknown as Record<string, unknown>).createObjectURL = (blob: Blob) => {
      captured.push(blob)
      return 'blob:mock'
    }
    ;(URL as unknown as Record<string, unknown>).revokeObjectURL = () => {}
  })

  afterEach(() => {
    delete (URL as unknown as Record<string, unknown>).createObjectURL
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL
  })

  it('quotes and escapes cells', async () => {
    downloadCsv('x.csv', [{ a: 'say "hi"', b: 42 }])
    const text = await readBlob(captured[0])
    expect(text).toBe('a,b\n"say ""hi""","42"')
  })

  it('neutralises formula-trigger cells to prevent CSV injection', async () => {
    downloadCsv('x.csv', [{ a: '=SUM(A1)', b: '+1', c: '-2', d: '@cmd', e: 'safe' }])
    const text = await readBlob(captured[0])
    expect(text).toContain('"\'=SUM(A1)"')
    expect(text).toContain('"\'+1"')
    expect(text).toContain('"\'-2"')
    expect(text).toContain('"\'@cmd"')
    expect(text).toContain('"safe"')
  })

  it('emits a headerless file for empty rows without throwing', () => {
    expect(() => downloadCsv('empty.csv', [])).not.toThrow()
    expect(captured.length).toBe(1)
  })
})

describe('csvFilename', () => {
  it('prefixes with the current date', () => {
    const name = csvFilename('rent_roll')
    expect(name).toMatch(/^rent_roll_\d{4}-\d{2}-\d{2}\.csv$/)
  })
})

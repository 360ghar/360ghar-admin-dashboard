/**
 * Shared CSV export utilities.
 *
 * `downloadCsv` moved here from `features/pm/utils.ts` so every feature can
 * reuse it without importing from the PM module. The PM module re-exports it
 * for backward compatibility.
 */

/**
 * Spreadsheet formula triggers: cells starting with these are neutralised
 * with a leading apostrophe to prevent CSV formula injection when the export
 * is opened in Excel/Sheets.
 */
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r'])

/**
 * Escape one CSV cell. Every value is quoted; embedded quotes are doubled.
 */
const escapeCsv = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  const neutralised = FORMULA_TRIGGERS.has(s.charAt(0)) ? `'${s}` : s
  return `"${neutralised.replaceAll('"', '""')}"`
}

export const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    // Still emit a headerless file so the download triggers.
    const blob = new Blob([''], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Build a timestamped filename, e.g. `properties_2026-06-18.csv`. */
export const csvFilename = (prefix: string) => `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`

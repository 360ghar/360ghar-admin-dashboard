/** Include the owner in every PM list cursor identity. */
export function pmCursorKey(ownerId: number | null, ...filters: Array<string | number | null>): string {
  return JSON.stringify([ownerId, ...filters])
}

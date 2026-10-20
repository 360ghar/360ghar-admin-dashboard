interface CachedListEntry {
  endpointName: string
  originalArgs: unknown
}

/** Apply a list patch to every cached filter and page for one endpoint. */
export function patchCachedEntries(
  entries: readonly CachedListEntry[],
  endpointName: string,
  patch: (args: unknown) => { undo: () => void },
): Array<{ undo: () => void }> {
  return entries.filter((entry) => entry.endpointName === endpointName).map((entry) => patch(entry.originalArgs))
}

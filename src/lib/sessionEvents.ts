export const STAFF_PROFILE_RECHECK_EVENT = '360ghar:staff-profile-recheck'

/** A resource 403 requests an authoritative staff check before access changes. */
export function requestStaffProfileRecheck() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STAFF_PROFILE_RECHECK_EVENT))
}

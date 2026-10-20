import type { Visit, VisitContext, VisitStatus } from '@/types/api'

/** Wire values of `VisitStatus`, typed over the generated union. */
const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  reschedule_suggested: 'Reschedule suggested',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export const VISIT_STATUSES = Object.keys(VISIT_STATUS_LABELS) as VisitStatus[]

export function isVisitStatus(value: string): value is VisitStatus {
  return Object.prototype.hasOwnProperty.call(VISIT_STATUS_LABELS, value)
}

/** A visit is either a property tour or a flatmates meet-up. */
export const VISIT_CONTEXT_LABELS: Record<VisitContext, string> = {
  property_tour: 'Property tour',
  flatmate_meet: 'Flatmate meet',
}

/** Visitor name from the `user` summary (`{ id, display_name, avatar_url }`). Never contact data. */
export function visitorName(visit: Pick<Visit, 'user' | 'user_id'>): string {
  return visit.user?.display_name || `User #${visit.user_id}`
}

/** The other party of a flatmates meet-up, when the visit has one. */
export function counterpartyName(visit: Pick<Visit, 'counterparty_user'>): string | null {
  return visit.counterparty_user?.display_name || null
}

/** Assigned agent, from the `agents` key of the visit. */
export function visitAgentName(visit: Pick<Visit, 'agents' | 'agent_id'>): string | null {
  if (visit.agents?.name) return visit.agents.name
  return visit.agent_id != null ? `Agent #${visit.agent_id}` : null
}

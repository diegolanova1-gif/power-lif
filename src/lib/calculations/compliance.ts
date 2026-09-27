export type ComplianceStatus = 'done' | 'partial' | 'none'

interface PrescribedExercise {
  sets: number
  reps: number
  load_type?: 'kg' | 'percent'
  load_value?: number
}

export interface LoggedSetLike {
  reps: number
  weight_kg: number
}

/**
 * Did the athlete do what the coach asked?
 * done: all sets, at least the minimum reps, and at least the kg prescribed (when given in kg).
 * %RM loads can't be checked without the athlete's 1RM, so only sets/reps count there.
 */
export function exerciseCompliance(p: PrescribedExercise, logged: LoggedSetLike[]): ComplianceStatus {
  if (logged.length === 0) return 'none'
  const minKg = p.load_type === 'kg' && p.load_value !== undefined ? p.load_value : null
  const complete =
    logged.length >= p.sets && logged.every(s => s.reps >= p.reps && (minKg === null || Number(s.weight_kg) >= minKg))
  return complete ? 'done' : 'partial'
}

export function sessionCompliance(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.length === 0 || statuses.every(s => s === 'none')) return 'none'
  return statuses.every(s => s === 'done') ? 'done' : 'partial'
}

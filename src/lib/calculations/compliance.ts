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
 * done: every prescribed set got logged (regardless of reps/kg actually hit —
 * that shortfall is flagged to the coach separately, see `repsShortfall`).
 * partial: fewer sets logged than prescribed. none: nothing logged.
 */
export function exerciseCompliance(p: PrescribedExercise, logged: LoggedSetLike[]): ComplianceStatus {
  if (logged.length === 0) return 'none'
  return logged.length >= p.sets ? 'done' : 'partial'
}

/** All sets were logged, but reps or kg fell short of the prescription — still "done", just worth the coach's attention. */
export function repsShortfall(p: PrescribedExercise, logged: LoggedSetLike[]): boolean {
  const minKg = p.load_type === 'kg' && p.load_value !== undefined ? p.load_value : null
  return logged.length >= p.sets && !logged.every(s => s.reps >= p.reps && (minKg === null || Number(s.weight_kg) >= minKg))
}

export function sessionCompliance(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.length === 0 || statuses.every(s => s === 'none')) return 'none'
  return statuses.every(s => s === 'done') ? 'done' : 'partial'
}

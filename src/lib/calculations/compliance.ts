export type ComplianceStatus = 'done' | 'partial' | 'none'

interface PrescribedExercise {
  sets: number
  reps?: number
  duration_seconds?: number
  load_type?: 'kg' | 'percent'
  load_value?: number
}

export interface LoggedSetLike {
  reps: number | null
  weight_kg: number
  duration_seconds?: number | null
}

/**
 * Did the athlete do what the coach asked?
 * done: every prescribed set got logged (regardless of reps/kg actually hit —
 * that shortfall is flagged to the coach separately, see `repsShortfall`).
 * partial: fewer sets logged than prescribed. none: nothing logged.
 */
export function exerciseCompliance(_p: PrescribedExercise, logged: LoggedSetLike[]): ComplianceStatus {
  return logged.length > 0 ? 'done' : 'none'
}

/** All sets were logged, but reps/duration or kg fell short of the prescription — still "done", just worth the coach's attention. */
export function repsShortfall(p: PrescribedExercise, logged: LoggedSetLike[]): boolean {
  const minKg = p.load_type === 'kg' && p.load_value !== undefined ? p.load_value : null
  if (p.duration_seconds !== undefined) {
    return logged.length >= p.sets && !logged.every(s => (s.duration_seconds ?? 0) >= p.duration_seconds! && (minKg === null || Number(s.weight_kg) >= minKg))
  }
  return logged.length >= p.sets && !logged.every(s => (s.reps ?? 0) >= (p.reps ?? 0) && (minKg === null || Number(s.weight_kg) >= minKg))
}

export function sessionCompliance(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.length === 0 || statuses.every(s => s === 'none')) return 'none'
  if (statuses.some(s => s === 'done')) return 'done'
  return 'none'
}

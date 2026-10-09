export type AlertType = 'streak_broken' | 'adherence_dropping' | 'one_rm_stalled'

export interface AthleteAlert {
  type: AlertType
  message: string
}

/** 3+ semanas reales con datos, cayendo dos semanas seguidas, y ya por debajo del 70%. */
export function detectAdherenceDrop(weekly: { adherence: number }[]): boolean {
  if (weekly.length < 3) return false
  const [a, b, c] = weekly.slice(-3).map(w => w.adherence)
  return a > b && b > c && c < 70
}

/** Racha en 0 pero ya venía entrenando antes — recién empezados no cuentan. */
export function detectStreakBroken(streak: number, hasPriorTraining: boolean): boolean {
  return streak === 0 && hasPriorTraining
}

/**
 * Entrenó el levantamiento en los últimos `staleDays` (hay estimaciones
 * recientes, RPE>=7) pero ninguna superó la mejor marca de antes de ese
 * período — está activo en el ejercicio pero no progresa.
 */
export function detectOneRMStalled(points: { date: string; value: number }[], now: Date = new Date(), staleDays = 21): boolean {
  if (points.length < 2) return false
  const cutoff = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000)
  const recent = points.filter(p => new Date(p.date) >= cutoff)
  const older = points.filter(p => new Date(p.date) < cutoff)
  if (!recent.length || !older.length) return false
  const recentBest = Math.max(...recent.map(p => p.value))
  const olderBest = Math.max(...older.map(p => p.value))
  return recentBest <= olderBest
}

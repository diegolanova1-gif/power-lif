export type OneRMFormula = 'epley' | 'brzycki' | 'lombardi' | 'mayhew' | 'oconnor' | 'wathan'

export interface OneRMResult {
  formula: OneRMFormula
  estimated1RM: number
  weight: number
  reps: number
}

/**
 * Calculate 1RM using various formulas
 * Default: Epley (most common for powerlifting)
 */
export function estimate1RM(
  weight: number,
  reps: number,
  formula: OneRMFormula = 'epley'
): number {
  if (reps <= 0) return weight
  if (reps === 1) return weight

  switch (formula) {
    case 'epley':
      // Epley: 1RM = weight * (1 + reps/30)
      return weight * (1 + reps / 30)

    case 'brzycki':
      // Brzycki: 1RM = weight * (36 / (37 - reps)); undefined/negative at reps >= 37
      if (reps >= 37) return weight * (1 + reps / 30) // fall back to Epley
      return weight * (36 / (37 - reps))

    case 'lombardi':
      // Lombardi: 1RM = weight * reps^0.10
      return weight * Math.pow(reps, 0.10)

    case 'mayhew':
      // Mayhew et al.: 1RM = (100 * weight) / (52.2 + 41.9 * e^(-0.055 * reps))
      return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps))

    case 'oconnor':
      // O'Conner et al.: 1RM = weight * (1 + 0.025 * reps)
      return weight * (1 + 0.025 * reps)

    case 'wathan':
      // Wathan: 1RM = (100 * weight) / (48.8 + 53.8 * e^(-0.075 * reps))
      return (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps))

    default:
      return weight * (1 + reps / 30)
  }
}

/**
 * Calculate 1RM using all formulas and return the average
 */
export function estimate1RMAll(weight: number, reps: number): OneRMResult[] {
  const formulas: OneRMFormula[] = ['epley', 'brzycki', 'lombardi', 'mayhew', 'oconnor', 'wathan']
  return formulas.map((formula) => ({
    formula,
    estimated1RM: estimate1RM(weight, reps, formula),
    weight,
    reps,
  }))
}

/**
 * Get the median 1RM from all formulas (more robust than average)
 */
export function estimate1RMMedian(weight: number, reps: number): number {
  const results = estimate1RMAll(weight, reps)
  const sorted = results.map((r) => r.estimated1RM).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * RPE-based 1RM: Epley with reps in reserve added (RIR = 10 - RPE).
 * Must match the SQL trigger update_estimated_1rm (supabase/migrations/20260926_feedback_media.sql).
 */
export function estimate1RMFromRPE(weight: number, reps: number, rpe: number): number {
  const effectiveReps = reps + (10 - rpe)
  return effectiveReps <= 1 ? weight : weight * (1 + effectiveReps / 30)
}
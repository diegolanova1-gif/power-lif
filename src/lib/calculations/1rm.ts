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
      // Brzycki: 1RM = weight * (36 / (37 - reps))
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
 * Calculate RPE-based 1RM (using RPE to adjust)
 * Based on Mike Tuchscherer's RPE chart
 */
export function estimate1RMFromRPE(weight: number, reps: number, rpe: number): number {
  // RPE to %1RM mapping (approximate)
  const rpeToPercent: Record<number, number> = {
    10: 1.00,
    9.5: 0.97,
    9: 0.94,
    8.5: 0.91,
    8: 0.88,
    7.5: 0.85,
    7: 0.82,
    6.5: 0.79,
    6: 0.76,
    5.5: 0.73,
    5: 0.70,
  }

  const percent = rpeToPercent[rpe] || rpeToPercent[8]
  const repMax = estimate1RM(weight, reps, 'epley')
  return repMax * percent
}
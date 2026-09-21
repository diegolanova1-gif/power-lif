/**
 * IPF Points Calculation (Official IPF Formula)
 * Used for comparing lifters across weight classes
 */
export function calculateIPFPoints(
  bodyweightKg: number,
  totalKg: number,
  sex: 'M' | 'F'
): number {
  // IPF Coefficients (2020 version)
  const coefficients = sex === 'M'
    ? {
        a: 1236.25115,
        b: 1449.21864,
        c: 0.01644,
        d: 359.13847,
        e: 449.51337,
      }
    : {
        a: 758.63878,
        b: 949.31382,
        c: 0.02437,
        d: 310.95796,
        e: 553.42231,
      }

  const { a, b, c, d, e } = coefficients

  // IPF Points = a * total^2 + b * total + c * bodyweight^2 + d * bodyweight + e
  // Wait, the actual formula is different. Let me use the correct one.

  // Correct IPF Formula (2020):
  // Points = 100 * Total / (a - b * e^(-c * bodyweight))
  // Actually, the formula uses coefficients for the denominator

  // The actual IPF formula:
  // For men: Points = Total * 100 / (a - b * exp(-c * bodyweight))
  // Where a, b, c are specific coefficients

  // Let me use the simplified version with the official coefficients:
  // Men: a=1236.25115, b=1449.21864, c=0.01644
  // Women: a=758.63878, b=949.31382, c=0.02437

  const denominator = a - b * Math.exp(-c * bodyweightKg)
  const points = (totalKg * 100) / denominator

  return Math.round(points * 100) / 100
}

/**
 * DOTS Score Calculation
 * Dynamic Objective Team Scoring - used in some federations
 */
export function calculateDOTSScore(
  bodyweightKg: number,
  totalKg: number,
  sex: 'M' | 'F'
): number {
  const coeff = sex === 'M'
    ? { a: -307.75076, b: 24.0900756, c: -0.1918759221, d: 0.0007391293, e: -0.000001093 }
    : { a: -57.96288, b: 13.6175032, c: -0.112662549, d: 0.0005158568, e: -0.0000010706 }

  const { a, b, c, d, e } = coeff
  const bw = bodyweightKg

  const denominator = a + b * bw + c * bw * bw + d * bw * bw * bw + e * bw * bw * bw * bw
  const dots = (totalKg * 500) / denominator

  return Math.round(dots * 100) / 100
}

/**
 * Wilks Score Calculation (Old IPF formula, still used in some places)
 */
export function calculateWilksScore(
  bodyweightKg: number,
  totalKg: number,
  sex: 'M' | 'F'
): number {
  const coeff = sex === 'M'
    ? {
        a: -216.0475144,
        b: 16.2606339,
        c: -0.002388645,
        d: -0.00113732,
        e: 7.01863e-6,
        f: -1.291e-8,
      }
    : {
        a: 594.31747775582,
        b: -27.23842536447,
        c: 0.82112226871,
        d: -0.00930733913,
        e: 4.731582e-5,
        f: -9.054e-8,
      }

  const { a, b, c, d, e, f } = coeff
  const bw = bodyweightKg

  const denominator = a + b * bw + c * bw * bw + d * bw * bw * bw + e * bw * bw * bw * bw + f * bw * bw * bw * bw * bw
  const wilks = (totalKg * 500) / denominator

  return Math.round(wilks * 100) / 100
}

/**
 * Calculate total from best Squat, Bench, Deadlift
 */
export function calculatePowerliftingTotal(
  squat: number,
  bench: number,
  deadlift: number
): number {
  return squat + bench + deadlift
}

/**
 * Get weight class for bodyweight
 */
export function getWeightClass(bodyweightKg: number, sex: 'M' | 'F'): string {
  const menClasses = [59, 66, 74, 83, 93, 105, 120, Infinity]
  const womenClasses = [47, 52, 57, 63, 69, 76, 84, Infinity]

  const classes = sex === 'M' ? menClasses : womenClasses
  const classLimit = classes.find((limit) => bodyweightKg <= limit) || classes[classes.length - 1]

  if (classLimit === Infinity) {
    return sex === 'M' ? '120+' : '84+'
  }

  return `${classLimit}`
}

/**
 * Calculate all scores at once
 */
export interface AllScores {
  ipfPoints: number
  dotsScore: number
  wilksScore: number
  total: number
  weightClass: string
}

export function calculateAllScores(
  bodyweightKg: number,
  squat: number,
  bench: number,
  deadlift: number,
  sex: 'M' | 'F'
): AllScores {
  const total = calculatePowerliftingTotal(squat, bench, deadlift)

  return {
    ipfPoints: calculateIPFPoints(bodyweightKg, total, sex),
    dotsScore: calculateDOTSScore(bodyweightKg, total, sex),
    wilksScore: calculateWilksScore(bodyweightKg, total, sex),
    total,
    weightClass: getWeightClass(bodyweightKg, sex),
  }
}
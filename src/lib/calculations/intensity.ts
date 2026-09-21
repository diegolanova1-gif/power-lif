import type { Tables } from '@/types/database'
import { type SetLog, calculateVolume } from './volume'

export type { SetLog }

/**
 * Calculate average intensity (% 1RM) for a set of logs
 */
export function calculateAverageIntensity(
  sets: SetLog[],
  oneRMMap: Map<string, number>
): number {
  if (sets.length === 0) return 0

  let totalIntensity = 0
  let validSets = 0

  for (const set of sets) {
    const oneRM = oneRMMap.get(set.exercise_id)
    if (!oneRM || oneRM === 0) continue

    const intensity = (set.weight_kg / oneRM) * 100
    totalIntensity += intensity
    validSets++
  }

  return validSets > 0 ? totalIntensity / validSets : 0
}

/**
 * Calculate intensity distribution
 */
export function calculateIntensityDistribution(
  sets: SetLog[],
  oneRMMap: Map<string, number>
): Map<number, number> {
  const distribution = new Map<number, number>()

  for (const set of sets) {
    const oneRM = oneRMMap.get(set.exercise_id)
    if (!oneRM || oneRM === 0) continue

    const intensity = Math.round((set.weight_kg / oneRM) * 100 / 5) * 5 // Round to nearest 5%
    const current = distribution.get(intensity) || 0
    distribution.set(intensity, current + 1)
  }

  return distribution
}

/**
 * Calculate average RPE
 */
export function calculateAverageRPE(sets: SetLog[]): number {
  const setsWithRPE = sets.filter((s) => s.rpe !== null && s.rpe !== undefined)
  if (setsWithRPE.length === 0) return 0

  const sum = setsWithRPE.reduce((acc, s) => acc + (s.rpe || 0), 0)
  return sum / setsWithRPE.length
}

/**
 * Calculate average RIR (Reps In Reserve)
 */
export function calculateAverageRIR(sets: SetLog[]): number {
  const setsWithRIR = sets.filter((s) => s.rir !== null && s.rir !== undefined)
  if (setsWithRIR.length === 0) return 0

  const sum = setsWithRIR.reduce((acc, s) => acc + (s.rir || 0), 0)
  return sum / setsWithRIR.length
}

/**
 * Calculate session intensity metrics
 */
export interface SessionIntensityMetrics {
  averageIntensity: number
  peakIntensity: number
  averageRPE: number
  averageRIR: number
  totalSets: number
  workingSets: number
  volume: number
}

export function calculateSessionMetrics(
  sets: SetLog[],
  oneRMMap: Map<string, number>
): SessionIntensityMetrics {
  const workingSets = sets.filter((s) => (s.rpe ?? 0) >= 6)

  return {
    averageIntensity: calculateAverageIntensity(sets, oneRMMap),
    peakIntensity: Math.max(...sets.map(s => {
      const oneRM = oneRMMap.get(s.exercise_id)
      return oneRM ? (s.weight_kg / oneRM) * 100 : 0
    }), 0),
    averageRPE: calculateAverageRPE(sets),
    averageRIR: calculateAverageRIR(sets),
    totalSets: sets.length,
    workingSets: workingSets.length,
    volume: calculateVolume(sets),
  }
}
import type { Tables } from '@/types/database'

export type SetLog = Tables<'sets_log'>

/**
 * Calculate total volume (kg) for a set of logs
 * Volume = weight_kg * reps
 */
export function calculateVolume(sets: SetLog[]): number {
  return sets.reduce((sum, set) => sum + set.weight_kg * set.reps, 0)
}

/**
 * Calculate volume per exercise
 */
export function calculateVolumeByExercise(sets: SetLog[]): Map<string, number> {
  const volumes = new Map<string, number>()

  for (const set of sets) {
    const current = volumes.get(set.exercise_id) || 0
    volumes.set(set.exercise_id, current + set.weight_kg * set.reps)
  }

  return volumes
}

/**
 * Calculate weekly volume grouped by week
 */
export function calculateWeeklyVolume(sets: SetLog[]): Map<number, number> {
  const weekly = new Map<number, number>()

  for (const set of sets) {
    const current = weekly.get(set.week) || 0
    weekly.set(set.week, current + set.weight_kg * set.reps)
  }

  return weekly
}

/**
 * Calculate volume by exercise and week
 */
export function calculateVolumeByExerciseAndWeek(sets: SetLog[]): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>()

  for (const set of sets) {
    let exerciseMap = result.get(set.exercise_id)
    if (!exerciseMap) {
      exerciseMap = new Map<number, number>()
      result.set(set.exercise_id, exerciseMap)
    }
    const current = exerciseMap.get(set.week) || 0
    exerciseMap.set(set.week, current + set.weight_kg * set.reps)
  }

  return result
}

/**
 * Calculate tonnage (total weight lifted regardless of reps)
 */
export function calculateTonnage(sets: SetLog[]): number {
  return sets.reduce((sum, set) => sum + set.weight_kg, 0)
}

/**
 * Calculate number of working sets (excluding warm-ups, typically RPE < 6)
 */
export function calculateWorkingSets(sets: SetLog[], minRPE = 6): number {
  return sets.filter((set) => (set.rpe ?? 0) >= minRPE).length
}

/**
 * Get volume distribution by intensity zones
 * Zone 1: < 60% 1RM, Zone 2: 60-70%, Zone 3: 70-80%, Zone 4: 80-90%, Zone 5: > 90%
 */
export function calculateVolumeByIntensityZone(
  sets: SetLog[],
  oneRMMap: Map<string, number>
): Record<string, number> {
  const zones = {
    'zone1': 0, // < 60%
    'zone2': 0, // 60-70%
    'zone3': 0, // 70-80%
    'zone4': 0, // 80-90%
    'zone5': 0, // > 90%
  }

  for (const set of sets) {
    const oneRM = oneRMMap.get(set.exercise_id)
    if (!oneRM || oneRM === 0) continue

    const intensity = (set.weight_kg / oneRM) * 100
    const volume = set.weight_kg * set.reps

    if (intensity < 60) zones.zone1 += volume
    else if (intensity < 70) zones.zone2 += volume
    else if (intensity < 80) zones.zone3 += volume
    else if (intensity < 90) zones.zone4 += volume
    else zones.zone5 += volume
  }

  return zones
}
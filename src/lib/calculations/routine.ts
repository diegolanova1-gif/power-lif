import type { RoutineStructure } from '@/lib/validations/routine'

export type LiftCategory = 'squat' | 'bench' | 'deadlift' | 'accessory' | 'olympic' | 'other'

export interface RoutineSummary {
  weeks: number
  daysPerWeek: number
  progression: RoutineStructure['progression']
  deloadWeeks: number[]
  exerciseCount: number
  weeklySets: number
  weeklyReps: number
  setsByCategory: Record<LiftCategory, number>
  /** kg × reps × sets, only exercises prescribed in kg */
  weeklyTonnageKg: number | null
  /** Average %RM across exercises prescribed as percent */
  avgPercentRM: number | null
  avgRpeTarget: number | null
}

const emptyCategories = (): Record<LiftCategory, number> => ({
  squat: 0,
  bench: 0,
  deadlift: 0,
  accessory: 0,
  olympic: 0,
  other: 0,
})

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

/**
 * Weekly training numbers of a routine (the schedule repeats every week).
 * Loads are only comparable when both routines use the same unit, so tonnage
 * only counts kg loads and %RM is averaged separately.
 */
export function summarizeRoutine(
  structure: RoutineStructure,
  categoryById: Map<string, string | null>
): RoutineSummary {
  const exercises = structure.schedule.flatMap(d => d.exercises)
  const setsByCategory = emptyCategories()
  let tonnage = 0
  let hasKgLoads = false

  for (const ex of exercises) {
    const category = (categoryById.get(ex.exercise_id) ?? 'other') as LiftCategory
    setsByCategory[category in setsByCategory ? category : 'other'] += ex.sets
    if (ex.load_type === 'kg' && ex.load_value !== undefined) {
      hasKgLoads = true
      tonnage += ex.load_value * ex.reps * ex.sets
    }
  }

  return {
    weeks: structure.weeks,
    daysPerWeek: structure.schedule.length,
    progression: structure.progression,
    deloadWeeks: structure.deload_weeks ?? [],
    exerciseCount: new Set(exercises.map(e => e.exercise_id)).size,
    weeklySets: exercises.reduce((sum, e) => sum + e.sets, 0),
    weeklyReps: exercises.reduce((sum, e) => sum + e.sets * e.reps, 0),
    setsByCategory,
    weeklyTonnageKg: hasKgLoads ? Math.round(tonnage) : null,
    avgPercentRM: average(
      exercises.filter(e => e.load_type === 'percent' && e.load_value !== undefined).map(e => e.load_value!)
    ),
    avgRpeTarget: average(exercises.filter(e => e.rpe_target !== undefined).map(e => e.rpe_target!)),
  }
}

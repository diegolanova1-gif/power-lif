import { z } from 'zod'

// Exercise within a day
export const routineExerciseSchema = z.object({
  exercise_id: z.string().uuid('ID de ejercicio inválido'),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(50),
  reps_max: z.number().int().min(1).max(100).optional(), // rep range, e.g. 8-12
  intensity: z.string().optional(), // display text, e.g. "100 kg" or "75% RM"
  load_type: z.enum(['kg', 'percent']).optional(),
  load_value: z.number().min(0).max(500).optional(),
  rpe_target: z.number().min(1).max(10).optional(),
  rest_seconds: z.number().int().min(0).max(600).optional(),
  note: z.string().max(300).optional(), // coach's tip/cue for this exercise
  order: z.number().int().min(0),
})

// Day within a week
export const routineDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  name: z.string().min(1).max(50),
  exercises: z.array(routineExerciseSchema).min(1),
})

// Full routine structure
export const routineStructureSchema = z.object({
  name: z.string().min(1).max(100),
  weeks: z.number().int().min(1).max(52),
  progression: z.enum(['linear', 'undulating', 'block', 'conjugate', 'custom']),
  goal: z.enum(['hypertrophy', 'strength', 'powerlifting', 'bulk', 'cut', 'general']).optional(),
  // Week 1 (and every week without its own plan)
  schedule: z.array(routineDaySchema).min(1).max(7),
  // Weeks whose content differs from week 1 (same training days, different exercises/loads)
  week_plans: z.array(z.object({
    week: z.number().int().min(2).max(52),
    schedule: z.array(routineDaySchema).min(1).max(7),
  })).optional(),
  deload_weeks: z.array(z.number().int().min(1).max(52)).optional(),
})

export const createRoutineSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  description: z.string().max(1000).optional(),
  structure: routineStructureSchema,
})

export const updateRoutineSchema = createRoutineSchema.partial()

export const assignRoutineSchema = z.object({
  athlete_id: z.string().uuid('ID de atleta inválido'),
  routine_id: z.string().uuid('ID de rutina inválido'),
  started_at: z.string().date().optional(),
  current_week: z.number().int().min(1).default(1),
  current_day: z.number().int().min(1).max(7).default(1),
})

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>
export type AssignRoutineInput = z.infer<typeof assignRoutineSchema>
export type RoutineStructure = z.infer<typeof routineStructureSchema>

export const ROUTINE_GOALS: Record<NonNullable<RoutineStructure['goal']>, string> = {
  hypertrophy: 'Hipertrofia',
  strength: 'Fuerza',
  powerlifting: 'Powerlifting',
  bulk: 'Volumen',
  cut: 'Definición',
  general: 'General / Salud',
}

export function formatReps(e: { reps: number; reps_max?: number }) {
  return e.reps_max && e.reps_max > e.reps ? `${e.reps}-${e.reps_max}` : String(e.reps)
}

/** Schedule the athlete follows in a given week (week plan if any, else week 1) */
export function scheduleForWeek(structure: RoutineStructure, week: number) {
  return structure.week_plans?.find(p => p.week === week)?.schedule ?? structure.schedule
}

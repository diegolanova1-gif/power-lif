import { z } from 'zod'

// Exercise within a day
export const routineExerciseSchema = z.object({
  exercise_id: z.string().uuid('ID de ejercicio inválido'),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(50),
  intensity: z.string().optional(), // e.g., "75% 1RM" or "RPE 8"
  rpe_target: z.number().min(1).max(10).optional(),
  rest_seconds: z.number().int().min(0).max(600).optional(),
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
  schedule: z.array(routineDaySchema).min(1).max(7),
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
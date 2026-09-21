import { z } from 'zod'

export const logSetSchema = z.object({
  athlete_routine_id: z.string().uuid('ID de rutina asignada inválido'),
  exercise_id: z.string().uuid('ID de ejercicio inválido'),
  week: z.number().int().min(1).max(52),
  day: z.number().int().min(1).max(7),
  set_number: z.number().int().min(1).max(20),
  weight_kg: z.number().min(0).max(500).multipleOf(0.25), // 0.25kg increments
  reps: z.number().int().min(0).max(100),
  rpe: z.number().min(1).max(10).step(0.5).optional().nullable(),
  rir: z.number().min(0).max(10).step(0.5).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const logMultipleSetsSchema = z.object({
  sets: z.array(logSetSchema).min(1).max(50),
})

export const updateSetSchema = logSetSchema.partial().extend({
  id: z.string().uuid(),
})

export type LogSetInput = z.infer<typeof logSetSchema>
export type LogMultipleSetsInput = z.infer<typeof logMultipleSetsSchema>
export type UpdateSetInput = z.infer<typeof updateSetSchema>
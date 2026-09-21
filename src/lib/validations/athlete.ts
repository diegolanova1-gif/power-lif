import { z } from 'zod'

export const createAthleteSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'Nombre muy corto').max(100),
})

export const updateAthleteSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
})

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>
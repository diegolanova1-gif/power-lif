import { z } from 'zod'

const planSchema = z.enum(['basic', 'pro'])
// null = sin límite
const studentLimitSchema = z.number().int().min(0).max(10000).nullable()

export const createCoachSchema = z.object({
  full_name: z.string().trim().min(2, 'Nombre muy corto').max(100),
  email: z.string().trim().email('Email inválido'),
  password: z.string().trim().min(8, 'Mínimo 8 caracteres').max(72),
  plan: planSchema,
  student_limit: studentLimitSchema,
})

export const updateCoachSchema = z
  .object({
    plan: planSchema.optional(),
    student_limit: studentLimitSchema.optional(),
    active: z.boolean().optional(),
    password: z.string().trim().min(8, 'Mínimo 8 caracteres').max(72).optional(),
  })
  .refine(v => Object.keys(v).length > 0, 'Nada para actualizar')

export type CreateCoachInput = z.infer<typeof createCoachSchema>
export type UpdateCoachInput = z.infer<typeof updateCoachSchema>

'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createExerciseSchema = z.object({
  name: z.string().trim().min(2, 'Nombre muy corto').max(100),
  category: z.enum(['squat', 'bench', 'deadlift', 'accessory', 'olympic', 'other']),
  muscle_groups: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
})

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>

export async function createExercise(input: CreateExerciseInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const validation = createExerciseSchema.safeParse(input)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }
  const { name, category, muscle_groups } = validation.data

  // RLS only returns global + own exercises, so this checks what the coach can see
  const { data: existing } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', name.replace(/[%_\\]/g, '\\$&'))
    .limit(1)

  if (existing?.length) {
    return { error: `Ya existe un ejercicio llamado "${name}"` }
  }

  try {
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name,
        category,
        muscle_groups: muscle_groups?.length ? muscle_groups : null,
        is_competition_lift: false,
        created_by: user.id,
      })
      .select('id, name, category, is_competition_lift')
      .single()

    if (error) throw error

    return { success: true, exercise: data }
  } catch (error) {
    console.error('Error in createExercise:', error)
    const message = (error as { message?: string }).message ?? 'error desconocido'
    return { error: `No se pudo crear el ejercicio: ${message}` }
  }
}

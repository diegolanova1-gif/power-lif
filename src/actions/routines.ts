'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { routineStructureSchema, type RoutineStructure } from '@/lib/validations/routine'

export async function createRoutine(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const structureJson = formData.get('structure') as string

  if (!name || !structureJson) {
    return { error: 'Nombre y estructura son requeridos' }
  }

  let structure: RoutineStructure
  try {
    structure = routineStructureSchema.parse(JSON.parse(structureJson))
  } catch {
    return { error: 'Estructura de rutina inválida' }
  }

  try {
    const { data, error } = await supabase
      .from('routines')
      .insert({
        coach_id: user.id,
        name,
        description,
        structure,
        is_template: true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/coach/routines')
    return { success: true, routine: data }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateRoutine(routineId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const structureJson = formData.get('structure') as string

  const updates: any = {}
  if (name) updates.name = name
  if (description !== undefined) updates.description = description
  if (structureJson) {
    try {
      updates.structure = routineStructureSchema.parse(JSON.parse(structureJson))
    } catch {
      return { error: 'Estructura de rutina inválida' }
    }
  }

  updates.updated_at = new Date().toISOString()

  try {
    const { error } = await supabase
      .from('routines')
      .update(updates)
      .eq('id', routineId)
      .eq('coach_id', user.id)

    if (error) throw error

    revalidatePath('/coach/routines')
    revalidatePath(`/coach/routines/${routineId}/edit`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteRoutine(routineId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  // athlete_routines (and their sets_log) cascade on delete: never wipe athlete history
  const { count } = await supabase
    .from('athlete_routines')
    .select('id', { count: 'exact', head: true })
    .eq('routine_id', routineId)

  if (count) {
    return { error: `Rutina asignada a ${count} atleta(s). No se puede eliminar sin perder su historial.` }
  }

  try {
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .eq('coach_id', user.id)

    if (error) throw error

    revalidatePath('/coach/routines')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function assignRoutine(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const athleteId = formData.get('athlete_id') as string
  const routineId = formData.get('routine_id') as string
  const startedAt = formData.get('started_at') as string
  const currentWeek = parseInt(formData.get('current_week') as string) || 1
  const currentDay = parseInt(formData.get('current_day') as string) || 1

  if (!athleteId || !routineId) {
    return { error: 'Atleta y rutina son requeridos' }
  }

  // Verify coach owns the routine and athlete
  const [routineCheck, athleteCheck] = await Promise.all([
    supabase.from('routines').select('id').eq('id', routineId).eq('coach_id', user.id).single(),
    supabase.from('coach_athletes').select('id').eq('coach_id', user.id).eq('athlete_id', athleteId).single(),
  ])

  if (routineCheck.error || !routineCheck.data) {
    return { error: 'Rutina no encontrada o sin permisos' }
  }
  if (athleteCheck.error || !athleteCheck.data) {
    return { error: 'Atleta no encontrado o sin permisos' }
  }

  try {
    // Deactivate any existing active routine for this athlete
    await supabase
      .from('athlete_routines')
      .update({ status: 'paused' })
      .eq('athlete_id', athleteId)
      .eq('status', 'active')

    const { data, error } = await supabase
      .from('athlete_routines')
      .insert({
        athlete_id: athleteId,
        routine_id: routineId,
        started_at: startedAt || new Date().toISOString().split('T')[0],
        current_week: currentWeek,
        current_day: currentDay,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/coach/athletes')
    revalidatePath(`/coach/athletes/${athleteId}`)
    return { success: true, athleteRoutine: data }
  } catch (error: any) {
    return { error: error.message }
  }
}
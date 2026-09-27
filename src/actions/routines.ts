'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { routineStructureSchema, type RoutineStructure } from '@/lib/validations/routine'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

async function isCoachOf(supabase: SupabaseServer, coachId: string, athleteId: string) {
  const { data } = await supabase
    .from('coach_athletes')
    .select('athlete_id')
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .maybeSingle()
  return !!data
}

// Pauses the athlete's active program and starts this one on its first scheduled day
async function activateRoutine(
  supabase: SupabaseServer,
  athleteId: string,
  routineId: string,
  structure: RoutineStructure,
  startedAt?: string
) {
  await supabase
    .from('athlete_routines')
    .update({ status: 'paused' })
    .eq('athlete_id', athleteId)
    .eq('status', 'active')

  return supabase
    .from('athlete_routines')
    .insert({
      athlete_id: athleteId,
      routine_id: routineId,
      started_at: startedAt || new Date().toISOString().split('T')[0],
      current_week: 1,
      current_day: Math.min(...structure.schedule.map(d => d.day)),
      status: 'active',
    })
    .select()
    .single()
}

export async function createRoutine(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const structureJson = formData.get('structure') as string
  // Personalized routine: created for (and assigned to) one athlete, not a template
  const athleteId = (formData.get('athlete_id') as string) || null

  if (!name || !structureJson) {
    return { error: 'Nombre y estructura son requeridos' }
  }

  let structure: RoutineStructure
  try {
    structure = routineStructureSchema.parse(JSON.parse(structureJson))
  } catch {
    return { error: 'Estructura de rutina inválida' }
  }

  if (athleteId && !(await isCoachOf(supabase, user.id, athleteId))) {
    return { error: 'Alumno no encontrado o sin permisos' }
  }

  try {
    const { data, error } = await supabase
      .from('routines')
      .insert({
        coach_id: user.id,
        name,
        description,
        structure,
        is_template: !athleteId,
      })
      .select()
      .single()

    if (error) throw error

    if (athleteId) {
      const { error: assignError } = await activateRoutine(supabase, athleteId, data.id, structure)
      if (assignError) throw assignError
      revalidatePath('/coach/athletes')
    }

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

  if (!athleteId || !routineId) {
    return { error: 'Atleta y rutina son requeridos' }
  }

  const [{ data: routine }, linked] = await Promise.all([
    supabase.from('routines').select('id, name, description, structure, is_template').eq('id', routineId).eq('coach_id', user.id).maybeSingle(),
    isCoachOf(supabase, user.id, athleteId),
  ])

  if (!routine) return { error: 'Rutina no encontrada o sin permisos' }
  if (!linked) return { error: 'Alumno no encontrado o sin permisos' }

  try {
    // Templates are copied so the athlete gets their own editable routine
    let assignedId = routine.id
    if (routine.is_template) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', athleteId).maybeSingle()
      const { data: copy, error: copyError } = await supabase
        .from('routines')
        .insert({
          coach_id: user.id,
          name: `${routine.name} · ${profile?.full_name || 'Alumno'}`.slice(0, 100),
          description: routine.description,
          structure: routine.structure,
          is_template: false,
        })
        .select('id')
        .single()
      if (copyError) throw copyError
      assignedId = copy.id
    }

    const { data, error } = await activateRoutine(supabase, athleteId, assignedId, routine.structure as RoutineStructure, startedAt)
    if (error) throw error

    revalidatePath('/coach/routines')

    revalidatePath('/coach/athletes')
    revalidatePath(`/coach/athletes/${athleteId}`)
    return { success: true, athleteRoutine: data }
  } catch (error: any) {
    return { error: error.message }
  }
}
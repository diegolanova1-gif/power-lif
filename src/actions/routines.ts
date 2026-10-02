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

// Starts this routine on its first scheduled day, then pauses whatever else
// was active. Insert-first so a failure here never leaves the athlete with
// zero active programs; a failure in the best-effort pause step below at
// worst leaves an old program also marked 'active' (reads already pick the
// most recently assigned one).
async function activateRoutine(
  supabase: SupabaseServer,
  athleteId: string,
  routineId: string,
  structure: RoutineStructure,
  startedAt?: string
) {
  const result = await supabase
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

  if (result.error || !result.data) return result

  await supabase
    .from('athlete_routines')
    .update({ status: 'paused' })
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .neq('id', result.data.id)

  return result
}

// A template assigned directly (without copying) could end up referenced by
// two athletes' athlete_routines at once; editing it for one would silently
// change it for the other. Copy whenever it's already claimed by someone else.
async function copyRoutineForAthlete(
  supabase: SupabaseServer,
  coachId: string,
  athleteId: string,
  routine: { name: string; description: string | null; structure: unknown }
) {
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', athleteId).maybeSingle()
  const { data: copy, error } = await supabase
    .from('routines')
    .insert({
      coach_id: coachId,
      name: `${routine.name} · ${profile?.full_name || 'Alumno'}`.slice(0, 100),
      description: routine.description,
      structure: routine.structure,
      is_template: false,
    })
    .select('id')
    .single()
  if (error) throw error
  return copy.id as string
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

    if (updates.structure) {
      const structure = updates.structure as RoutineStructure
      const totalWeeks = structure.weeks || 1
      const trainingDays = [...structure.schedule].map(d => d.day).sort((a, b) => a - b)
      const firstDay = trainingDays[0]

      // Adding weeks to a routine an athlete already finished leaves them stuck
      // 'completed' forever (every athlete page only queries status='active').
      // Resume them at the first newly-added week.
      const { data: stuck } = await supabase
        .from('athlete_routines')
        .select('id, current_week')
        .eq('routine_id', routineId)
        .eq('status', 'completed')

      for (const row of stuck ?? []) {
        const nextWeek = row.current_week + 1
        if (nextWeek > totalWeeks) continue
        await supabase
          .from('athlete_routines')
          .update({ status: 'active', current_week: nextWeek, current_day: firstDay })
          .eq('id', row.id)
      }

      // Removing/moving a training day can leave an active athlete pointed at
      // a day that no longer exists in the schedule (they'd see "no hay
      // entrenamiento programado" forever). Bump them to the next valid day,
      // rolling into the next week or completing the program if needed.
      const { data: active } = await supabase
        .from('athlete_routines')
        .select('id, current_week, current_day')
        .eq('routine_id', routineId)
        .eq('status', 'active')

      for (const row of active ?? []) {
        if (trainingDays.includes(row.current_day)) continue
        const nextDay = trainingDays.find(d => d > row.current_day)
        if (nextDay !== undefined) {
          await supabase.from('athlete_routines').update({ current_day: nextDay }).eq('id', row.id)
        } else if (row.current_week < totalWeeks) {
          await supabase
            .from('athlete_routines')
            .update({ current_week: row.current_week + 1, current_day: firstDay })
            .eq('id', row.id)
        } else {
          await supabase.from('athlete_routines').update({ status: 'completed' }).eq('id', row.id)
        }
      }
    }

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
      assignedId = await copyRoutineForAthlete(supabase, user.id, athleteId, routine)
    } else {
      const { data: claimedByOther } = await supabase
        .from('athlete_routines')
        .select('athlete_id')
        .eq('routine_id', routine.id)
        .neq('athlete_id', athleteId)
        .limit(1)
      if (claimedByOther && claimedByOther.length > 0) {
        assignedId = await copyRoutineForAthlete(supabase, user.id, athleteId, routine)
      }
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
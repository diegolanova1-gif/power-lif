'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { estimate1RM, estimate1RMFromRPE } from '@/lib/calculations/1rm'
import { z } from 'zod'

const logSetSchema = z.object({
  athlete_routine_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  week: z.number().int().min(1).max(52),
  day: z.number().int().min(1).max(7),
  set_number: z.number().int().min(1).max(20),
  weight_kg: z.number().min(0).max(500).multipleOf(0.25),
  reps: z.number().int().min(0).max(100),
  rpe: z.number().min(1).max(10).step(0.5).optional().nullable(),
  rir: z.number().min(0).max(10).step(0.5).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export async function logSet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  // Parse form data
  const rawData = {
    athlete_routine_id: formData.get('athlete_routine_id'),
    exercise_id: formData.get('exercise_id'),
    week: parseInt(formData.get('week') as string),
    day: parseInt(formData.get('day') as string),
    set_number: parseInt(formData.get('set_number') as string),
    weight_kg: parseFloat(formData.get('weight_kg') as string),
    reps: parseInt(formData.get('reps') as string),
    rpe: formData.get('rpe') ? parseFloat(formData.get('rpe') as string) : null,
    rir: formData.get('rir') ? parseFloat(formData.get('rir') as string) : null,
    notes: formData.get('notes') as string || null,
  }

  const validation = logSetSchema.safeParse(rawData)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const data = validation.data

  // Verify athlete owns this routine (or coach is logging for athlete)
  const { data: routine } = await supabase
    .from('athlete_routines')
    .select('athlete_id')
    .eq('id', data.athlete_routine_id)
    .single()

  if (!routine) return { error: 'Rutina no encontrada' }

  const isOwnRoutine = routine.athlete_id === user.id
  const isCoach = false // Check coach role if needed

  if (!isOwnRoutine && !isCoach) {
    return { error: 'No tienes permiso para registrar en esta rutina' }
  }

  try {
    // Insert the set
    const { data: setData, error } = await supabase
      .from('sets_log')
      .insert({
        athlete_id: routine.athlete_id,
        athlete_routine_id: data.athlete_routine_id,
        exercise_id: data.exercise_id,
        week: data.week,
        day: data.day,
        set_number: data.set_number,
        weight_kg: data.weight_kg,
        reps: data.reps,
        rpe: data.rpe,
        rir: data.rir,
        notes: data.notes,
      })
      .select()
      .single()

    if (error) throw error

    // Calculate 1RM if RPE >= 7 and it's a competition lift
    if (data.rpe && data.rpe >= 7 && data.reps > 0) {
      const { data: exercise } = await supabase
        .from('exercises')
        .select('is_competition_lift')
        .eq('id', data.exercise_id)
        .single()

      if (exercise?.is_competition_lift) {
        // Use RPE-based 1RM for better accuracy
        const estimated1RMValue = data.rpe
          ? estimate1RMFromRPE(data.weight_kg, data.reps, data.rpe)
          : estimate1RM(data.weight_kg, data.reps)

        await supabase
          .from('estimated_1rm')
          .insert({
            athlete_id: routine.athlete_id,
            exercise_id: data.exercise_id,
            estimated_1rm: Math.round(estimated1RMValue * 100) / 100,
            source_set_id: setData.id,
          })
      }
    }

    // Update athlete_routine current position if needed
    // (Optional: auto-advance day/week based on completed sets)

    revalidatePath('/athlete/log')
    revalidatePath('/athlete/progress')
    revalidatePath('/athlete/history')
    revalidatePath('/coach/athletes')

    return { success: true, set: setData }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function logMultipleSets(sets: z.infer<typeof logSetSchema>[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  if (sets.length === 0) return { error: 'No hay series para registrar' }

  // Verify all sets belong to the same athlete routine
  const routineId = sets[0].athlete_routine_id
  const { data: routine } = await supabase
    .from('athlete_routines')
    .select('athlete_id')
    .eq('id', routineId)
    .single()

  if (!routine) return { error: 'Rutina no encontrada' }

  const isOwnRoutine = routine.athlete_id === user.id
  if (!isOwnRoutine) {
    return { error: 'No tienes permiso para registrar en esta rutina' }
  }

  try {
    // Insert all sets
    const { data: setData, error } = await supabase
      .from('sets_log')
      .insert(
        sets.map(s => ({
          athlete_id: routine.athlete_id,
          athlete_routine_id: s.athlete_routine_id,
          exercise_id: s.exercise_id,
          week: s.week,
          day: s.day,
          set_number: s.set_number,
          weight_kg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
          rir: s.rir,
          notes: s.notes,
        }))
      )
      .select()

    if (error) throw error

    // Calculate 1RMs for competition lifts with RPE >= 7
    const competitionSets = sets.filter(s =>
      s.rpe && s.rpe >= 7 && s.reps > 0
    )

    if (competitionSets.length > 0) {
      const exerciseIds = [...new Set(competitionSets.map(s => s.exercise_id))]
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, is_competition_lift')
        .in('id', exerciseIds)

      const competitionLifts = new Set(
        exercises?.filter(e => e.is_competition_lift).map(e => e.id) || []
      )

      const oneRMInserts = competitionSets
        .filter(s => competitionLifts.has(s.exercise_id))
        .map((s, idx) => ({
          athlete_id: routine.athlete_id,
          exercise_id: s.exercise_id,
          estimated_1rm: Math.round(
            (s.rpe
              ? estimate1RMFromRPE(s.weight_kg, s.reps, s.rpe)
              : estimate1RM(s.weight_kg, s.reps)) * 100
          ) / 100,
          source_set_id: setData[idx]?.id,
        }))

      if (oneRMInserts.length > 0) {
        await supabase.from('estimated_1rm').insert(oneRMInserts)
      }
    }

    revalidatePath('/athlete/log')
    revalidatePath('/athlete/progress')
    revalidatePath('/athlete/history')
    revalidatePath('/coach/athletes')

    return { success: true, sets: setData }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteSet(setId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  try {
    // Verify ownership
    const { data: set } = await supabase
      .from('sets_log')
      .select('athlete_id')
      .eq('id', setId)
      .single()

    if (!set || set.athlete_id !== user.id) {
      return { error: 'No tienes permiso para eliminar esta serie' }
    }

    const { error } = await supabase
      .from('sets_log')
      .delete()
      .eq('id', setId)

    if (error) throw error

    revalidatePath('/athlete/log')
    revalidatePath('/athlete/progress')
    revalidatePath('/athlete/history')

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
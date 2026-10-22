import type { Prescription, LoggedSet } from '@/components/athlete/exercise-log-card'
import { scheduleForWeek, type RoutineStructure } from '@/lib/validations/routine'

export interface DayData {
  week: number
  day: number
  name: string
  exercises: Prescription[]
}

export interface WorkoutData {
  session: { userId: string; athleteRoutineId: string }
  startedAt: string
  days: DayData[]
  currentIndex: number
  setsByKey: Record<string, LoggedSet[]>
  realDateByDay: Record<string, string>
  lastWeight: Record<string, number>
  lastReps: Record<string, number>
  best: Record<string, number>
}

export const setsKey = (week: number, day: number, exerciseId: string) => `${week}-${day}-${exerciseId}`

export async function loadWorkout(supabase: { auth: any; from: any }): Promise<WorkoutData | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: routine } = await supabase
    .from('athlete_routines')
    .select('id, current_week, current_day, started_at, structure')
    .eq('athlete_id', user.id)
    .in('status', ['active', 'completed'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const structure = routine?.structure as RoutineStructure | null
  if (!routine || !structure?.schedule?.length) return null

  const allSchedules = [structure.schedule, ...(structure.week_plans ?? []).map((p: any) => p.schedule)]
  const exerciseIds = [...new Set(allSchedules.flatMap((s: any) => s.flatMap((d: any) => d.exercises.map((e: any) => e.exercise_id))))]
  const [{ data: exercises }, { data: sets }, { data: history }, { data: estimates }] = await Promise.all([
    supabase.from('exercises').select('id, name, video_url').in('id', exerciseIds),
    supabase
      .from('sets_log')
      .select('week, day, exercise_id, set_number, reps, duration_seconds, weight_kg, rpe, completed_at, extra_type, substituted_exercise_id')
      .eq('athlete_routine_id', routine.id),
    supabase
      .from('sets_log')
      .select('exercise_id, weight_kg, reps')
      .eq('athlete_id', user.id)
      .in('exercise_id', exerciseIds)
      .order('weight_kg', { ascending: false })
      .limit(exerciseIds.length * 10),
    supabase.from('estimated_1rm').select('exercise_id, estimated_1rm').eq('athlete_id', user.id).in('exercise_id', exerciseIds),
  ])

  const nameById = new Map(exercises?.map((e: any) => [e.id, e.name as string]) ?? [])
  const videoById = new Map(exercises?.map((e: any) => [e.id, e.video_url as string | null]) ?? [])

  const substituteIds = [...new Set((sets ?? []).map((s: any) => s.substituted_exercise_id).filter((id: any): id is string => !!id && !nameById.has(id)))]
  if (substituteIds.length) {
    const { data: substitutes } = await supabase.from('exercises').select('id, name').in('id', substituteIds)
    substitutes?.forEach((e: any) => nameById.set(e.id, e.name))
  }

  const days: DayData[] = Array.from({ length: structure.weeks || 1 }, (_, i) => i + 1).flatMap(week =>
    [...scheduleForWeek(structure, week)].sort((a, b) => a.day - b.day).map(d => ({
      week,
      day: d.day,
      name: d.name,
      exercises: [...d.exercises]
        .sort((a, b) => a.order - b.order)
        .map(e => ({
          exercise_id: e.exercise_id,
          exercise_name: (nameById.get(e.exercise_id) ?? 'Ejercicio') as string,
          video_url: (videoById.get(e.exercise_id) ?? null) as string | null,
          sets: e.sets,
          reps: e.reps,
          reps_max: e.reps_max,
          duration_seconds: e.duration_seconds,
          load_type: e.load_type,
          load_value: e.load_value,
          rpe_target: e.rpe_target,
          rest_seconds: e.rest_seconds,
          note: e.note,
        })),
    }))
  )
  const target = days.findIndex(d => d.week === routine.current_week && d.day === routine.current_day)

  const setsByKey: Record<string, LoggedSet[]> = {}
  for (const s of sets ?? []) {
    const key = setsKey(s.week, s.day, s.exercise_id)
    ;(setsByKey[key] ??= []).push({
      set_number: s.set_number,
      reps: s.reps,
      duration_seconds: s.duration_seconds,
      weight_kg: Number(s.weight_kg),
      rpe: s.rpe,
      substitutedExerciseId: s.substituted_exercise_id,
      substitutedExerciseName: s.substituted_exercise_id ? ((nameById.get(s.substituted_exercise_id) ?? null) as string | null) : null,
    })
  }
  Object.values(setsByKey).forEach(list => list.sort((a, b) => a.set_number - b.set_number))

  const realDateByDay: Record<string, string> = {}
  for (const s of sets ?? []) {
    if (s.extra_type === 'freeform') continue
    const key = `${s.week}-${s.day}`
    const completed = s.completed_at as string
    if (!realDateByDay[key] || completed < realDateByDay[key]) realDateByDay[key] = completed
  }

  const lastWeight: Record<string, number> = {}
  const lastReps: Record<string, number> = {}
  for (const h of history ?? []) {
    const w = Number(h.weight_kg)
    if (w > (lastWeight[h.exercise_id] ?? 0)) {
      lastWeight[h.exercise_id] = w
      if (h.reps != null) lastReps[h.exercise_id] = Number(h.reps)
    }
  }
  for (const s of sets ?? []) {
    const w = Number(s.weight_kg)
    if (w > (lastWeight[s.exercise_id] ?? 0)) {
      lastWeight[s.exercise_id] = w
      if (s.reps != null) lastReps[s.exercise_id] = Number(s.reps)
    }
  }

  const best: Record<string, number> = {}
  for (const e of estimates ?? []) best[e.exercise_id] = Math.max(best[e.exercise_id] ?? 0, Number(e.estimated_1rm))

  return {
    session: { userId: user.id, athleteRoutineId: routine.id as string },
    startedAt: routine.started_at as string,
    days,
    currentIndex: target >= 0 ? target : 0,
    setsByKey,
    realDateByDay,
    lastWeight,
    lastReps,
    best,
  }
}

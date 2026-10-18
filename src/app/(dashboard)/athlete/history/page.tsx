import { createClient } from '@/lib/supabase/server'
import { HistoryView, type HistorySession } from '@/components/athlete/history-view'

export default async function AthleteHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: routine } = await supabase
    .from('athlete_routines')
    .select('id')
    .eq('athlete_id', user.id)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!routine) {
    return <HistoryView sessions={[]} />
  }

  const { data: sets } = await supabase
    .from('sets_log')
    .select(`
      week,
      day,
      completed_at,
      set_number,
      weight_kg,
      reps,
      duration_seconds,
      rpe,
      rir,
      notes,
      exercise_id,
      exercises!sets_log_exercise_id_fkey(name, category)
    `)
    .eq('athlete_routine_id', routine.id)
    .order('completed_at', { ascending: false })

  const sessionMap = new Map<string, HistorySession>()

  ;(sets || []).forEach((set: any) => {
    const date = set.completed_at.split('T')[0]
    const key = `${set.week}-${set.day}-${date}`

    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        week: set.week,
        day: set.day,
        date,
        exercises: [],
        total_volume: 0,
        total_sets: 0,
        avg_rpe: null,
      })
    }

    const session = sessionMap.get(key)!
    if (set.reps !== null) session.total_volume += set.weight_kg * set.reps
    session.total_sets += 1
    if (set.rpe) {
      session.avg_rpe = session.avg_rpe === null ? set.rpe : (session.avg_rpe + set.rpe) / 2
    }

    let exercise = session.exercises.find(e => e.exercise_id === set.exercise_id)
    if (!exercise) {
      exercise = {
        exercise_id: set.exercise_id,
        exercise_name: set.exercises?.name || 'Ejercicio',
        category: set.exercises?.category || 'other',
        sets: [],
      }
      session.exercises.push(exercise)
    }

    exercise.sets.push({
      set_number: set.set_number,
      weight_kg: set.weight_kg,
      reps: set.reps,
      duration_seconds: set.duration_seconds,
      rpe: set.rpe,
      rir: set.rir,
      notes: set.notes || '',
    })
  })

  const sessions = Array.from(sessionMap.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return <HistoryView sessions={sessions} />
}

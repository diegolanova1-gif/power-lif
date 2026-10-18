export interface OneRMPoint {
  date: string
  estimated_1rm: number
}

export interface ExerciseProgress {
  exercise_id: string
  exercise_name: string
  category: string
  oneRM: OneRMPoint[]
  bestWeight: { date: string; weight_kg: number }[]
}

export interface VolumePoint {
  week: number
  volume: number
}

export interface ProgressData {
  exercises: ExerciseProgress[]
  volume: VolumePoint[]
  trainedDates: string[]
}

export async function loadProgress(supabase: { auth: any; from: any }): Promise<ProgressData | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: currentRoutine } = await supabase
    .from('athlete_routines')
    .select('id')
    .eq('athlete_id', user.id)
    .in('status', ['active', 'completed'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const [{ data: oneRM }, { data: weightSets }, volumeResult, { data: adherenceSets }] = await Promise.all([
    supabase
      .from('estimated_1rm')
      .select('estimated_1rm, calculated_at, exercise_id, exercises(name, category)')
      .eq('athlete_id', user.id)
      .order('calculated_at', { ascending: true }),
    supabase
      .from('sets_log')
      .select('exercise_id, weight_kg, reps, completed_at, exercises!sets_log_exercise_id_fkey(name, category)')
      .eq('athlete_id', user.id)
      .gt('weight_kg', 0)
      .gt('reps', 0)
      .order('completed_at', { ascending: true }),
    currentRoutine
      ? supabase
          .from('sets_log')
          .select('week, weight_kg, reps')
          .eq('athlete_id', user.id)
          .eq('athlete_routine_id', currentRoutine.id)
          .order('week', { ascending: true })
      : { data: [] as any[] },
    supabase
      .from('sets_log')
      .select('completed_at')
      .eq('athlete_id', user.id)
      .gte('completed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const exerciseMap = new Map<string, ExerciseProgress>()

  for (const item of oneRM ?? []) {
    const ex = item as any
    let entry = exerciseMap.get(ex.exercise_id)
    if (!entry) {
      entry = { exercise_id: ex.exercise_id, exercise_name: ex.exercises?.name ?? 'Ejercicio', category: ex.exercises?.category ?? '', oneRM: [], bestWeight: [] }
      exerciseMap.set(ex.exercise_id, entry)
    }
    const day = String(ex.calculated_at).slice(0, 10)
    const value = Number(ex.estimated_1rm)
    const existing = entry.oneRM.find(p => p.date.slice(0, 10) === day)
    if (existing) existing.estimated_1rm = Math.max(existing.estimated_1rm, value)
    else entry.oneRM.push({ date: ex.calculated_at, estimated_1rm: value })
  }

  for (const s of weightSets ?? []) {
    const info = s.exercises as unknown as { name: string; category: string } | null
    let entry = exerciseMap.get(s.exercise_id)
    if (!entry) {
      entry = { exercise_id: s.exercise_id, exercise_name: info?.name ?? 'Ejercicio', category: info?.category ?? '', oneRM: [], bestWeight: [] }
      exerciseMap.set(s.exercise_id, entry)
    }
    const day = String(s.completed_at).slice(0, 10)
    const value = Number(s.weight_kg)
    const existing = entry.bestWeight.find(p => p.date.slice(0, 10) === day)
    if (existing) existing.weight_kg = Math.max(existing.weight_kg, value)
    else entry.bestWeight.push({ date: s.completed_at, weight_kg: value })
  }

  const volumeRaw = volumeResult.data ?? []
  const weekly: Record<number, number> = {}
  for (const set of volumeRaw) weekly[set.week] = (weekly[set.week] || 0) + set.weight_kg * set.reps
  const volume = Object.entries(weekly).map(([w, v]) => ({ week: Number(w), volume: v }))

  const dateStrs = (adherenceSets ?? []).map((s: any) => String(s.completed_at).split('T')[0])
  const trainedDates: string[] = [...new Set<string>(dateStrs)]

  return {
    exercises: [...exerciseMap.values()].sort((a, b) => a.exercise_name.localeCompare(b.exercise_name)),
    volume,
    trainedDates,
  }
}

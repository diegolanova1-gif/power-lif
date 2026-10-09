import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { classifyTrend } from '@/lib/calculations/progression'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get('athlete_id') || user.id

  // Verify access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'coach' && athleteId !== user.id) {
    const { data: link } = await supabase
      .from('coach_athletes')
      .select('athlete_id')
      .eq('coach_id', user.id)
      .eq('athlete_id', athleteId)
      .single()
    if (!link) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  } else if (profile?.role === 'athlete' && athleteId !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data: sets, error } = await supabase
    .from('sets_log')
    .select('exercise_id, weight_kg, reps, completed_at, exercises!sets_log_exercise_id_fkey(name, category)')
    .eq('athlete_id', athleteId)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .order('completed_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mejor peso por día y por ejercicio (varias series el mismo día = una marca)
  const byExercise = new Map<string, { name: string; category: string; points: Map<string, number> }>()
  for (const s of sets ?? []) {
    const ex = s.exercises as unknown as { name: string; category: string } | null
    const entry = byExercise.get(s.exercise_id) ?? { name: ex?.name ?? 'Ejercicio', category: ex?.category ?? '', points: new Map() }
    const day = String(s.completed_at).slice(0, 10)
    entry.points.set(day, Math.max(entry.points.get(day) ?? 0, Number(s.weight_kg)))
    byExercise.set(s.exercise_id, entry)
  }

  const data = [...byExercise.entries()]
    .map(([exerciseId, { name, category, points }]) => {
      const dataPoints = [...points.entries()].map(([date, weight_kg]) => ({ date, weight_kg })).sort((a, b) => a.date.localeCompare(b.date))
      const trendResult = classifyTrend(dataPoints.map(p => ({ date: p.date, value: p.weight_kg })))
      return { exercise_id: exerciseId, exercise_name: name, category, dataPoints, ...trendResult }
    })
    .sort((a, b) => (a.trend === 'down' ? -1 : b.trend === 'down' ? 1 : 0) || a.exercise_name.localeCompare(b.exercise_name))

  return NextResponse.json({ data })
}

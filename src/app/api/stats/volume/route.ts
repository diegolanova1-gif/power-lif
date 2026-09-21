import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { calculateWeeklyVolume, calculateVolumeByExerciseAndWeek } from '@/lib/calculations/volume'

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
  const weeks = parseInt(searchParams.get('weeks') || '12')

  // Verify access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'coach' && athleteId !== user.id) {
    const { data: link } = await supabase
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', user.id)
      .eq('athlete_id', athleteId)
      .single()
    if (!link) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  } else if (profile?.role === 'athlete' && athleteId !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  const { data: sets, error } = await supabase
    .from('sets_log')
    .select('week, weight_kg, reps, exercise_id, exercises(name, category)')
    .eq('athlete_id', athleteId)
    .gte('completed_at', startDate.toISOString())
    .order('completed_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const weeklyVolume = calculateWeeklyVolume(sets || [])
  const byExerciseAndWeek = calculateVolumeByExerciseAndWeek(sets || [])

  const weeklyArray = Array.from(weeklyVolume.entries()).map(([week, volume]) => ({ week, volume }))
  const byExerciseArray = Array.from(byExerciseAndWeek.entries()).map(([exerciseId, weeksMap]) => {
    const ex = sets?.find(s => s.exercise_id === exerciseId)
    return {
      exercise_id: exerciseId,
      exercise_name: (ex?.exercises as any)?.name,
      category: (ex?.exercises as any)?.category,
      weekly: Array.from(weeksMap.entries()).map(([week, volume]) => ({ week, volume })),
    }
  })

  return NextResponse.json({
    weekly: weeklyArray,
    byExercise: byExerciseArray,
    totalVolume: Array.from(weeklyVolume.values()).reduce((a, b) => a + b, 0),
  })
}
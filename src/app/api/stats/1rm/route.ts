import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
  const exerciseId = searchParams.get('exercise_id')
  const range = searchParams.get('range') || 'all'

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

  let query = supabase
    .from('estimated_1rm')
    .select('estimated_1rm, calculated_at, exercise_id, exercises(name, category)')
    .eq('athlete_id', athleteId)
    .order('calculated_at', { ascending: true })

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId)
  }

  if (range !== 'all') {
    const months = range === '3m' ? 3 : range === '6m' ? 6 : 12
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    query = query.gte('calculated_at', startDate.toISOString())
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const grouped = data?.reduce((acc: any, item: any) => {
    const key = item.exercise_id
    if (!acc[key]) {
      acc[key] = {
        exercise_id: item.exercise_id,
        exercise_name: item.exercises?.name,
        category: item.exercises?.category,
        dataPoints: [],
      }
    }
    acc[key].dataPoints.push({
      date: item.calculated_at,
      estimated_1rm: item.estimated_1rm,
    })
    return acc
  }, {}) || {}

  return NextResponse.json({ data: Object.values(grouped) })
}
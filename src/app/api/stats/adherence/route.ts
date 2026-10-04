import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { calculateAdherence, calculateWeeklyAdherence, getAdherenceHeatmap, calculateStreak } from '@/lib/calculations/adherence'
import type { RoutineStructure } from '@/lib/validations/routine'

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
      .select('athlete_id')
      .eq('coach_id', user.id)
      .eq('athlete_id', athleteId)
      .single()
    if (!link) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  } else if (profile?.role === 'athlete' && athleteId !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Get athlete routine
  const { data: assigned } = await supabase
    .from('athlete_routines')
    .select('*, routine:routines(structure)')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .single()

  const structure = (assigned?.routine as unknown as { structure: RoutineStructure } | null)?.structure
  const routine = assigned && { ...assigned, sessions_per_week: structure?.schedule?.length }
  const programWeeks = structure?.weeks ?? weeks

  if (!routine || !structure) {
    return NextResponse.json({
      overall: 0,
      weekly: [],
      heatmap: [],
      streak: 0,
      currentWeekDays: 0,
      currentWeekRequired: 0,
    })
  }

  // Get sets. The streak is per-athlete (not per-routine): a program swap
  // mid-week shouldn't zero out days already trained this real week.
  const [{ data: sets }, { data: allSets }] = await Promise.all([
    supabase
      .from('sets_log')
      .select('week, day, completed_at, rpe')
      .eq('athlete_id', athleteId)
      .eq('athlete_routine_id', routine.id)
      .order('completed_at', { ascending: true }),
    supabase
      .from('sets_log')
      .select('week, day, exercise_id, completed_at, extra_type')
      .eq('athlete_id', athleteId)
      .order('completed_at', { ascending: true }),
  ])

  const overallAdherence = calculateAdherence(routine, sets || [])

  const weeklyAdherence = Array.from({ length: programWeeks }, (_, i) => {
    const weekNum = i + 1
    return {
      week: weekNum,
      adherence: calculateWeeklyAdherence(routine, sets || [], weekNum),
    }
  })

  const heatmap = getAdherenceHeatmap(routine, sets || [], programWeeks)
  const { streak, currentWeekDays, currentWeekRequired } = calculateStreak(allSets || [], structure)

  return NextResponse.json({
    overall: overallAdherence,
    weekly: weeklyAdherence,
    heatmap,
    streak,
    currentWeekDays,
    currentWeekRequired,
  })
}
import { createClient } from '@/lib/supabase/server'
import { AthletesList, type AthleteRow } from '@/components/coach/athletes-list'
import type { PlanId } from '@/lib/contact'

export default async function AthletesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: profile },
    { data: coachAthletes },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, student_limit')
      .eq('id', user.id)
      .single(),
    supabase
      .from('coach_athletes')
      .select(`
        athlete_id,
        profiles:athlete_id (
          id,
          full_name,
          email,
          avatar_url,
          created_at
        )
      `)
      .eq('coach_id', user.id),
  ])

  const athleteIds = coachAthletes?.map((d: any) => d.profiles?.id).filter(Boolean) || []

  const [{ data: routines }, { data: sessions }] = athleteIds.length > 0
    ? await Promise.all([
        supabase
          .from('athlete_routines')
          .select('id, athlete_id, routine_id, status, routines(name)')
          .in('athlete_id', athleteIds)
          .eq('status', 'active'),
        supabase
          .from('sets_log')
          .select('athlete_id, completed_at')
          .in('athlete_id', athleteIds)
          .order('completed_at', { ascending: false })
          .limit(athleteIds.length),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }]

  const lastSessions = new Map<string, string>()
  ;(sessions || []).forEach((s: any) => {
    if (!lastSessions.has(s.athlete_id)) {
      lastSessions.set(s.athlete_id, s.completed_at)
    }
  })

  const athletes: AthleteRow[] = (coachAthletes || []).map((item: any) => ({
    id: item.profiles?.id,
    full_name: item.profiles?.full_name,
    email: item.profiles?.email,
    avatar_url: item.profiles?.avatar_url,
    created_at: item.profiles?.created_at,
    current_routine: (routines || []).find((r: any) => r.athlete_id === item.profiles?.id)?.routines?.name || null,
    current_routine_id: (routines || []).find((r: any) => r.athlete_id === item.profiles?.id)?.routine_id || null,
    last_session: lastSessions.get(item.profiles?.id || '') || null,
  }))

  return (
    <AthletesList
      initialAthletes={athletes}
      plan={(profile?.plan as PlanId) || 'basic'}
      studentLimit={profile?.student_limit ?? null}
    />
  )
}

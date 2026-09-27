import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteTeamButton, TeamMembersEditor } from '@/components/coach/team-dialogs'
import { TeamLeaderboard } from '@/components/team-leaderboard'
import { TeamRankingPanel } from '@/components/coach/team-ranking-panel'

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const coachId = user?.id ?? ''

  const [{ data: team }, { data: links }, { data: exercises }, { data: rankings }] = await Promise.all([
    supabase.from('teams').select('id, name, lead_exercise_id, team_members(athlete_id)').eq('id', id).eq('coach_id', coachId).maybeSingle(),
    supabase.from('coach_athletes').select('profiles:athlete_id(id, full_name)').eq('coach_id', coachId),
    supabase.from('exercises').select('id, name, category, is_competition_lift').order('is_competition_lift', { ascending: false }).order('name'),
    supabase
      .from('team_rankings')
      .select('id, calculated_at, approved_at, entries')
      .eq('team_id', id)
      .order('calculated_at', { ascending: false })
      .limit(5),
  ])

  if (!team) notFound()

  const athletes = (links ?? [])
    .map(l => l.profiles as unknown as { id: string; full_name: string | null } | null)
    .filter((a): a is { id: string; full_name: string | null } => !!a)
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
  const memberIds = (team.team_members as { athlete_id: string }[]).map(m => m.athlete_id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/coach/teams" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
        </div>
        <DeleteTeamButton teamId={team.id} teamName={team.name} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrantes ({memberIds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMembersEditor teamId={team.id} athletes={athletes} memberIds={memberIds} />
        </CardContent>
      </Card>

      <TeamRankingPanel
        teamId={team.id}
        exercises={exercises ?? []}
        leadExerciseId={team.lead_exercise_id}
        rankings={rankings ?? []}
      />

      {memberIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista en vivo (solo vos)</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamLeaderboard key={memberIds.join()} teamId={team.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

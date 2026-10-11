import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TeamRankingOfficial } from '@/components/team-ranking-official'
import { StreakAchievements } from '@/components/athlete/streak-achievements'
import { getStreakAndAchievements } from '@/lib/server/achievements'
import type { RoutineStructure } from '@/lib/validations/routine'
import { cn } from '@/lib/utils'

export default async function AthleteTeamPage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const { team: teamParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // RLS (teams_member_select) returns only the teams this athlete belongs to
  const { data: teams } = await supabase.from('teams').select('id, name').order('name')
  const team = teams?.find(t => t.id === teamParam) ?? teams?.[0]

  // RLS (team_rankings_member_select_approved) only returns approved snapshots
  const { data: ranking } = team
    ? await supabase
        .from('team_rankings')
        .select('approved_at, entries')
        .eq('team_id', team.id)
        .not('approved_at', 'is', null)
        .order('approved_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  // Cartas de Racha: mismos datos y mismo cálculo que ya se usaban en Mi
  // Progreso, ahora mostrados acá. canUnlock=true porque esto corre con la
  // sesión del propio alumno.
  const [{ data: profile }, { data: assigned }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user?.id).single(),
    supabase
      .from('athlete_routines')
      .select('id, routine:routines(structure)')
      .eq('athlete_id', user?.id)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const structure = (assigned?.routine as unknown as { structure: RoutineStructure } | null)?.structure
  const achievements = user && structure ? await getStreakAndAchievements(supabase, user.id, structure, true) : null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Logros</h1>

      <Tabs defaultValue="logros">
        <TabsList>
          <TabsTrigger value="logros">Mis logros</TabsTrigger>
          <TabsTrigger value="ranking">Ranking del team</TabsTrigger>
        </TabsList>

        <TabsContent value="logros" className="pt-4">
          {achievements ? (
            <StreakAchievements
              unlockedCards={achievements.unlockedCards}
              unlockedDates={achievements.unlockedDates}
              streakDays={achievements.streak}
              currentWeekDays={achievements.currentWeekDays}
              currentWeekRequired={achievements.currentWeekRequired}
              athleteName={profile?.full_name ?? ''}
            />
          ) : (
            <div className="rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Todavía no tenés una rutina activa. Tu coach te la va a asignar.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="flex flex-col gap-4 pt-4">
          {!team ? (
            <div className="rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Todavía no estás en ningún team. Tu coach puede agregarte.</p>
            </div>
          ) : (
            <>
              {teams!.length > 1 ? (
                <div className="flex gap-1 border-b">
                  {teams!.map(t => (
                    <Link
                      key={t.id}
                      href={`/athlete/team?team=${t.id}`}
                      className={cn(
                        '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
                        t.id === team.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-1 text-sm font-medium text-muted-foreground">{team.name}</p>
              )}
              <TeamRankingOfficial ranking={ranking} currentUserId={user?.id} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Mi Team</h1>
        <p className="text-muted-foreground mt-1">Ranking y progreso de tus compañeros</p>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">Team</TabsTrigger>
          <TabsTrigger value="cartas">Logros</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4 pt-4">
          {!team ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">Todavía no estás en ningún team. Tu coach puede agregarte.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {teams!.length > 1 && (
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
              )}
              {teams!.length === 1 && <h2 className="text-xl font-semibold text-foreground">{team.name}</h2>}
              <TeamRankingOfficial ranking={ranking} currentUserId={user?.id} />
            </>
          )}
        </TabsContent>

        <TabsContent value="cartas" className="pt-4">
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
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">Todavía no tenés una rutina activa. Tu coach te la va a asignar.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

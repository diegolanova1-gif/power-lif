import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { TeamRankingOfficial } from '@/components/team-ranking-official'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Team</h1>
        <p className="text-gray-500 mt-1">Ranking y progreso de tus compañeros</p>
      </div>

      {!team ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">Todavía no estás en ningún team. Tu coach puede agregarte.</p>
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
                    t.id === team.id ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
                  )}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          )}
          {teams!.length === 1 && <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>}
          <TeamRankingOfficial ranking={ranking} currentUserId={user?.id} />
        </>
      )}
    </div>
  )
}

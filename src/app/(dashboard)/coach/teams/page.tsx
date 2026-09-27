import Link from 'next/link'
import { Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateTeamDialog } from '@/components/coach/team-dialogs'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, created_at, team_members(count)')
    .eq('coach_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-500 mt-1">Grupos de alumnos que comparan estadísticas y ranking entre sí</p>
        </div>
        <CreateTeamDialog />
      </div>

      {!teams || teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No tienes teams aún</p>
            <p className="mt-1 text-sm text-gray-400">Los alumnos de un team ven el ranking y el progreso de sus compañeros (no sus videos ni observaciones).</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => {
            const count = (team.team_members as unknown as { count: number }[])[0]?.count ?? 0
            return (
              <Link key={team.id} href={`/coach/teams/${team.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-orange-500" />
                      {team.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      {count} {count === 1 ? 'alumno' : 'alumnos'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, BarChart, Plus, TrendingUp, Clock, AlertTriangle, Flame, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAthleteAlerts } from '@/lib/server/alerts'
import type { AlertType } from '@/lib/calculations/alerts'

const ALERT_ICON: Record<AlertType, typeof Flame> = {
  streak_broken: Flame,
  adherence_dropping: TrendingDown,
  one_rm_stalled: AlertTriangle,
}

export default async function CoachDashboard() {
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

  // Get coach's athletes count
  const { data: athletes } = await supabase
    .from('coach_athletes')
    .select('athlete_id, profiles:athlete_id(full_name, avatar_url)')
    .eq('coach_id', user?.id || '')

  const athleteAlerts = user ? await getAthleteAlerts(supabase, user.id) : []

  // Get routines count
  const { data: routines } = await supabase
    .from('routines')
    .select('id')
    .eq('coach_id', user?.id || '')

  // Get active athlete routines (athletes currently on a program)
  const { data: activeRoutines } = await supabase
    .from('athlete_routines')
    .select('id, athlete_id, status')
    .in('athlete_id', athletes?.map(a => a.athlete_id) || [])
    .eq('status', 'active')

  const stats = [
    {
      name: 'Alumnos',
      value: athletes?.length || 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
      href: '/coach/athletes',
    },
    {
      name: 'Rutinas Creadas',
      value: routines?.length || 0,
      icon: FileText,
      color: 'text-green-600 bg-green-100',
      href: '/coach/routines',
    },
    {
      name: 'Programas Activos',
      value: activeRoutines?.length || 0,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
      href: '/coach/athletes',
    },
    {
      name: 'Analytics',
      value: 'Ver',
      icon: BarChart,
      color: 'text-orange-600 bg-orange-100',
      href: '/coach/analytics',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">Resumen de tu actividad como coach</p>
        </div>
        <Link href="/coach/athletes">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Alumno
          </Button>
        </Link>
      </div>

      {athleteAlerts.length > 0 && (
        <Card size="sm" className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
              Necesitan atención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {athleteAlerts.map(({ athleteId, athleteName, alerts }) => (
              <Link
                key={athleteId}
                href={`/coach/athletes/${athleteId}`}
                className="flex flex-col gap-1 rounded-lg p-2 hover:bg-muted transition-colors sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="font-medium text-foreground shrink-0">{athleteName}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {alerts.map((alert, i) => {
                    const Icon = ALERT_ICON[alert.type]
                    return (
                      <span key={i} className="flex items-center gap-1 text-sm text-warning-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {alert.message}
                      </span>
                    )
                  })}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="block">
            <Card size="sm" className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">{stat.name}</p>
                    <p className="font-mono text-xl font-extrabold tabular-nums text-foreground mt-0.5 sm:text-2xl">{stat.value}</p>
                  </div>
                  <div className={cn('hidden p-2.5 rounded-full sm:block', stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions: same destinations as the dumbbell FAB, so skip the
          repeat on phones where vertical space is scarce. */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card size="sm" className="hidden md:block">
          <CardHeader>
            <CardTitle className="text-base">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Link href="/coach/athletes">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Alumnos
              </Button>
            </Link>
            <Link href="/coach/routines/new">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Crear Rutina
              </Button>
            </Link>
            <Link href="/coach/routines">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Biblioteca
              </Button>
            </Link>
            <Link href="/coach/analytics">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <BarChart className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Athletes */}
        <Card size="sm" className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Alumnos Recientes</CardTitle>
            <Link href="/coach/athletes" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {athletes && athletes.length > 0 ? (
              <div className="max-h-64 space-y-1 overflow-y-auto sm:max-h-none sm:overflow-visible">
                {athletes.slice(0, 6).map((item: any) => (
                  <Link
                    key={item.athlete_id}
                    href={`/coach/athletes/${item.athlete_id}`}
                    className="flex items-center gap-3 p-1.5 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      {item.profiles?.avatar_url ? (
                        <img src={item.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full" />
                      ) : (
                        <span className="text-primary font-semibold">
                          {item.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.profiles?.full_name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground">Ver progreso →</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p>No tienes alumnos aún</p>
                <Link href="/coach/athletes">
                  <Button variant="link" className="mt-1" size="sm">
                    Agregar tu primer alumno
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
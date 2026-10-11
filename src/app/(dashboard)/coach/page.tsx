import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Users, Plus, ChevronRight, AlertTriangle, Flame, TrendingDown } from 'lucide-react'
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

  // RLS scopes this to the coach's athletes
  const { count: pendingReviews } = await supabase
    .from('exercise_feedback')
    .select('id', { count: 'exact', head: true })
    .is('reviewed_at', null)

  const pending = pendingReviews ?? 0
  const hasAthletes = !!athletes && athletes.length > 0

  const metrics = [
    { name: 'Revisiones pendientes', value: pending, href: '/coach/reviews', highlight: pending > 0 },
    { name: 'Alumnos', value: athletes?.length || 0, href: '/coach/athletes', highlight: false },
    { name: 'Rutinas activas', value: activeRoutines?.length || 0, href: '/coach/athletes', highlight: false },
    { name: 'Rutinas', value: routines?.length || 0, href: '/coach/routines', highlight: false },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Lo que necesita tu atención hoy</p>
        </div>
        <Link href="/coach/athletes">
          <Button size="sm" variant="outline">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo alumno
          </Button>
        </Link>
      </div>

      {athleteAlerts.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">Necesitan atención</h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {athleteAlerts.map(({ athleteId, athleteName, alerts }) => (
              <Link
                key={athleteId}
                href={`/coach/athletes/${athleteId}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="shrink-0 font-medium text-foreground">{athleteName}</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {alerts.map((alert, i) => {
                      const Icon = ALERT_ICON[alert.type]
                      return (
                        <span key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
                          {alert.message}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        hasAthletes && (
          <p className="px-1 text-sm text-muted-foreground">Ningún alumno necesita atención hoy.</p>
        )
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.name}
            href={metric.href}
            className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
          >
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
              {metric.highlight && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
              {metric.name}
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {metric.value}
            </p>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-muted-foreground">Tus alumnos</h2>
          {hasAthletes && (
            <Link href="/coach/athletes" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          )}
        </div>

        {hasAthletes ? (
          <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            {athletes.slice(0, 6).map((item: any) => (
              <Link
                key={item.athlete_id}
                href={`/coach/athletes/${item.athlete_id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  {item.profiles?.avatar_url ? (
                    <img src={item.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full" />
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {item.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {item.profiles?.full_name || 'Sin nombre'}
                </p>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Todavía no tenés alumnos.</p>
            <Link href="/coach/athletes">
              <Button variant="link" size="sm" className="mt-1">
                Agregar tu primer alumno
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

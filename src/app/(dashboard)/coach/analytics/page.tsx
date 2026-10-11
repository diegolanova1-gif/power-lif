import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { BarChart, UserPlus } from 'lucide-react'
import { AthleteAnalytics } from '@/components/coach/athlete-analytics'

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ athlete?: string }> }) {
  const { athlete } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: links } = await supabase
    .from('coach_athletes')
    .select('athlete_id, profiles:athlete_id(id, full_name)')
    .eq('coach_id', user?.id ?? '')

  const athletes = (links ?? [])
    .map(l => l.profiles as unknown as { id: string; full_name: string | null } | null)
    .filter((a): a is { id: string; full_name: string | null } => !!a)
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cómo viene cada alumno</p>
      </div>

      {athletes.length === 0 ? (
        <div className="rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
          <BarChart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Agregá alumnos para ver sus estadísticas</p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/coach/athletes" />}>
            <UserPlus className="mr-2 h-4 w-4" />
            Ir a alumnos
          </Button>
        </div>
      ) : (
        <AthleteAnalytics
          athletes={athletes}
          initialAthleteId={athletes.some(a => a.id === athlete) ? athlete! : athletes[0].id}
        />
      )}
    </div>
  )
}

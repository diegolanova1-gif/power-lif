import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">1RM estimado, volumen y adherencia de tus atletas</p>
      </div>

      {athletes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Agrega atletas para ver sus estadísticas</p>
            <Button className="mt-4" nativeButton={false} render={<Link href="/coach/athletes" />}>
              <UserPlus className="mr-2 h-4 w-4" />
              Ir a atletas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AthleteAnalytics
          athletes={athletes}
          initialAthleteId={athletes.some(a => a.id === athlete) ? athlete! : athletes[0].id}
        />
      )}
    </div>
  )
}

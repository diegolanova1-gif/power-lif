import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, BarChart, Plus, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  // Get coach's athletes count
  const { data: athletes } = await supabase
    .from('coach_athletes')
    .select('athlete_id, profiles:athlete_id(full_name, avatar_url)')
    .eq('coach_id', (await supabase.auth.getUser()).data.user?.id || '')

  // Get routines count
  const { data: routines } = await supabase
    .from('routines')
    .select('id')
    .eq('coach_id', (await supabase.auth.getUser()).data.user?.id || '')

  // Get active athlete routines (athletes currently on a program)
  const { data: activeRoutines } = await supabase
    .from('athlete_routines')
    .select('id, athlete_id, status')
    .in('athlete_id', athletes?.map(a => a.athlete_id) || [])
    .eq('status', 'active')

  const stats = [
    {
      name: 'Atletas',
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen de tu actividad como coach</p>
        </div>
        <Link href="/coach/athletes">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Atleta
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={cn('p-3 rounded-full', stat.color)}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/coach/athletes">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Gestionar Atletas
              </Button>
            </Link>
            <Link href="/coach/routines/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Crear Rutina
              </Button>
            </Link>
            <Link href="/coach/routines">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                Ver Biblioteca
              </Button>
            </Link>
            <Link href="/coach/analytics">
              <Button variant="outline" className="w-full justify-start gap-2">
                <BarChart className="h-4 w-4" />
                Ver Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Athletes */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Atletas Recientes</CardTitle>
            <Link href="/coach/athletes" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {athletes && athletes.length > 0 ? (
              <div className="space-y-3">
                {athletes.slice(0, 5).map((item: any) => (
                  <Link
                    key={item.athlete_id}
                    href={`/coach/athletes/${item.athlete_id}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {item.profiles?.avatar_url ? (
                        <img src={item.profiles.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {item.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.profiles?.full_name || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-500">Ver progreso →</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No tienes atletas aún</p>
                <Link href="/coach/athletes">
                  <Button variant="link" className="mt-2" size="sm">
                    Agregar tu primer atleta
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
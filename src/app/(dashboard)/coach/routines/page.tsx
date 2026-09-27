import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Pencil, Calendar, Users, GitCompare } from 'lucide-react'
import { AssignRoutineDialog } from '@/components/coach/assign-routine-dialog'
import { DeleteRoutineButton } from '@/components/coach/delete-routine-button'
import type { RoutineStructure } from '@/lib/validations/routine'

const PROGRESSION_LABELS: Record<string, string> = {
  linear: 'Lineal',
  undulating: 'Ondulante',
  block: 'Bloques',
  conjugate: 'Conjugado',
  custom: 'Personalizada',
}

export default async function RoutinesPage({ searchParams }: { searchParams: Promise<{ assign?: string }> }) {
  const { assign } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const coachId = user?.id ?? ''

  const [{ data: routines }, { data: links }] = await Promise.all([
    supabase
      .from('routines')
      .select('id, name, description, structure, updated_at')
      .eq('coach_id', coachId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('coach_athletes')
      .select('athlete_id, profiles:athlete_id(id, full_name)')
      .eq('coach_id', coachId),
  ])

  const athletes = (links ?? [])
    .map(l => l.profiles as unknown as { id: string; full_name: string | null } | null)
    .filter((a): a is { id: string; full_name: string | null } => !!a)
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))

  const routineIds = routines?.map(r => r.id) ?? []
  const { data: active } = routineIds.length
    ? await supabase
        .from('athlete_routines')
        .select('routine_id')
        .in('routine_id', routineIds)
        .eq('status', 'active')
    : { data: [] }

  const activeCount = new Map<string, number>()
  active?.forEach(a => activeCount.set(a.routine_id, (activeCount.get(a.routine_id) ?? 0) + 1))

  const assignTarget = athletes.find(a => a.id === assign)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Rutinas</h1>
          <p className="text-gray-500 mt-1">
            {assignTarget
              ? `Elige una rutina para asignar a ${assignTarget.full_name || 'tu atleta'}`
              : 'Crea programas y asígnalos a tus atletas'}
          </p>
        </div>
        <div className="flex gap-2">
          {routines && routines.length >= 2 && (
            <Button variant="outline" nativeButton={false} render={<Link href={`/coach/routines/compare?a=${routines[0].id}&b=${routines[1].id}`} />}>
              <GitCompare className="mr-2 h-4 w-4" />
              Comparar
            </Button>
          )}
          <Button nativeButton={false} render={<Link href="/coach/routines/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Rutina
          </Button>
        </div>
      </div>

      {!routines || routines.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No tienes rutinas aún</p>
            <Button className="mt-4" nativeButton={false} render={<Link href="/coach/routines/new" />}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primera rutina
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routines.map(routine => {
            const structure = routine.structure as RoutineStructure
            const assigned = activeCount.get(routine.id) ?? 0
            return (
              <Card key={routine.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{routine.name}</CardTitle>
                    <Badge variant="secondary">{PROGRESSION_LABELS[structure.progression] ?? structure.progression}</Badge>
                  </div>
                  {routine.description && (
                    <CardDescription className="line-clamp-2">{routine.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {structure.weeks} sem · {structure.schedule.length} días/sem
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {assigned} {assigned === 1 ? 'atleta activo' : 'atletas activos'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AssignRoutineDialog
                      routineId={routine.id}
                      routineName={routine.name}
                      athletes={athletes}
                      defaultAthleteId={assign}
                    />
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/coach/routines/${routine.id}/edit`} />}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                    <div className="ml-auto">
                      <DeleteRoutineButton routineId={routine.id} routineName={routine.name} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

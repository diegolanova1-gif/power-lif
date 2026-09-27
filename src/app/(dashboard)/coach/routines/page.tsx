import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Pencil, Calendar, GitCompare, User, LayoutTemplate } from 'lucide-react'
import { AssignRoutineDialog } from '@/components/coach/assign-routine-dialog'
import { DeleteRoutineButton } from '@/components/coach/delete-routine-button'
import { ROUTINE_GOALS, type RoutineStructure } from '@/lib/validations/routine'

type Athlete = { id: string; full_name: string | null }

export default async function RoutinesPage({ searchParams }: { searchParams: Promise<{ assign?: string }> }) {
  const { assign } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const coachId = user?.id ?? ''

  const [{ data: routines }, { data: links }] = await Promise.all([
    supabase
      .from('routines')
      .select('id, name, description, structure, is_template, updated_at')
      .eq('coach_id', coachId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('coach_athletes')
      .select('athlete_id, profiles:athlete_id(id, full_name)')
      .eq('coach_id', coachId),
  ])

  const athletes = (links ?? [])
    .map(l => l.profiles as unknown as Athlete | null)
    .filter((a): a is Athlete => !!a)
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
  const athleteName = new Map(athletes.map(a => [a.id, a.full_name || 'Alumno']))

  // Who uses each routine (latest assignment wins; active shown as "en curso")
  const routineIds = routines?.map(r => r.id) ?? []
  const { data: assignments } = routineIds.length
    ? await supabase
        .from('athlete_routines')
        .select('routine_id, athlete_id, status, assigned_at')
        .in('routine_id', routineIds)
        .order('assigned_at', { ascending: false })
    : { data: [] }

  const usage = new Map<string, { athleteId: string; status: string }[]>()
  assignments?.forEach(a => usage.set(a.routine_id, [...(usage.get(a.routine_id) ?? []), { athleteId: a.athlete_id, status: a.status }]))

  const personalized = (routines ?? []).filter(r => !r.is_template)
  const templates = (routines ?? []).filter(r => r.is_template)
  const assignTarget = athletes.find(a => a.id === assign)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rutinas</h1>
          <p className="text-gray-500 mt-1">
            {assignTarget
              ? `Elige una plantilla para ${assignTarget.full_name || 'tu alumno'} (se le crea una copia personal)`
              : 'Personalizadas por alumno y plantillas reutilizables'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {routines && routines.length >= 2 && (
            <Button variant="outline" nativeButton={false} render={<Link href={`/coach/routines/compare?a=${routines[0].id}&b=${routines[1].id}`} />}>
              <GitCompare className="mr-2 h-4 w-4" />
              Comparar
            </Button>
          )}
          {assignTarget && (
            <Button variant="outline" nativeButton={false} render={<Link href={`/coach/routines/new?athlete=${assignTarget.id}`} />}>
              <Plus className="mr-2 h-4 w-4" />
              Crear desde cero
            </Button>
          )}
          <Button nativeButton={false} render={<Link href="/coach/routines/new" />}>
            <LayoutTemplate className="mr-2 h-4 w-4" />
            Nueva plantilla
          </Button>
        </div>
      </div>

      {!assignTarget && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <User className="h-5 w-5" />
            Personalizadas ({personalized.length})
          </h2>
          {personalized.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-gray-500">
                Para armar una rutina a medida, ve a <Link href="/coach/athletes" className="text-primary hover:underline">Alumnos</Link> y elige
                &quot;Nueva rutina personalizada&quot;.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personalized.map(routine => {
                const owner = usage.get(routine.id)?.[0]
                return (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    subtitle={
                      owner
                        ? `${athleteName.get(owner.athleteId) ?? 'Alumno'} · ${owner.status === 'active' ? 'en curso' : owner.status === 'completed' ? 'terminada' : 'pausada'}`
                        : 'Sin asignar'
                    }
                  />
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <LayoutTemplate className="h-5 w-5" />
          Plantillas ({templates.length})
        </h2>
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Guarda aquí las rutinas que usas seguido para asignarlas en un clic.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(routine => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                subtitle={`Usada por ${new Set(usage.get(routine.id)?.map(u => u.athleteId)).size} alumno(s)`}
                assign={<AssignRoutineDialog routineId={routine.id} routineName={routine.name} athletes={athletes} defaultAthleteId={assign} />}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RoutineCard({
  routine,
  subtitle,
  assign,
}: {
  routine: { id: string; name: string; description: string | null; structure: unknown }
  subtitle: string
  assign?: React.ReactNode
}) {
  const structure = routine.structure as RoutineStructure
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{routine.name}</CardTitle>
          {structure.goal && <Badge variant="secondary">{ROUTINE_GOALS[structure.goal]}</Badge>}
        </div>
        {routine.description && <CardDescription className="line-clamp-2">{routine.description}</CardDescription>}
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <div className="space-y-1 text-sm text-gray-500">
          <p className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {structure.weeks} sem · {structure.schedule.length} días/sem
          </p>
          <p>{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {assign}
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
}

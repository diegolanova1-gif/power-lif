import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { FileText, Plus, GitCompare } from 'lucide-react'
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

  const goalOf = (r: { structure: unknown }) => {
    const s = r.structure as RoutineStructure
    return s.goal ? ROUTINE_GOALS[s.goal] : null
  }
  const metaOf = (r: { structure: unknown }, extra?: string) => {
    const s = r.structure as RoutineStructure
    return [goalOf(r), `${s.weeks} sem`, `${s.schedule.length} días/sem`, extra].filter(Boolean).join(' · ')
  }
  const STATUS_LABEL: Record<string, string> = { active: 'en curso', completed: 'terminada', paused: 'pausada' }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {assignTarget ? `Rutina para ${assignTarget.full_name || 'tu alumno'}` : 'Rutinas'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignTarget
              ? 'Elegí una plantilla. Se le crea una copia personal.'
              : 'Tu biblioteca de plantillas y las rutinas de cada alumno'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!assignTarget && routines && routines.length >= 2 && (
            <Button variant="outline" nativeButton={false} render={<Link href={`/coach/routines/compare?a=${routines[0].id}&b=${routines[1].id}`} />}>
              <GitCompare className="mr-2 h-4 w-4" />
              Comparar últimas dos
            </Button>
          )}
          {assignTarget && (
            <Button variant="outline" nativeButton={false} render={<Link href={`/coach/routines/new?athlete=${assignTarget.id}`} />}>
              <Plus className="mr-2 h-4 w-4" />
              Crear desde cero
            </Button>
          )}
          <Button nativeButton={false} render={<Link href="/coach/routines/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva plantilla
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          Plantillas <span className="font-mono tabular-nums">· {templates.length}</span>
        </h2>
        {templates.length === 0 ? (
          <div className="rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Guardá acá las rutinas que usás seguido y asignalas en un toque.</p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {templates.map(routine => {
              const users = new Set(usage.get(routine.id)?.map(u => u.athleteId)).size
              return (
                <div key={routine.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50">
                  <Link href={`/coach/routines/${routine.id}/edit`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{routine.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {metaOf(routine, users > 0 ? `${users} ${users === 1 ? 'alumno' : 'alumnos'}` : 'sin usar')}
                    </p>
                  </Link>
                  <AssignRoutineDialog routineId={routine.id} routineName={routine.name} athletes={athletes} defaultAthleteId={assign} />
                  <DeleteRoutineButton routineId={routine.id} routineName={routine.name} />
                </div>
              )
            })}
          </div>
        )}
      </section>

      {!assignTarget && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            De tus alumnos <span className="font-mono tabular-nums">· {personalized.length}</span>
          </h2>
          {personalized.length === 0 ? (
            <div className="rounded-2xl bg-card px-6 py-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              Para armar una rutina a medida, andá a{' '}
              <Link href="/coach/athletes" className="text-primary hover:underline">Alumnos</Link> y elegí
              &quot;Nueva rutina personalizada&quot;.
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
              {personalized.map(routine => {
                const owner = usage.get(routine.id)?.[0]
                const status = owner ? (STATUS_LABEL[owner.status] ?? owner.status) : 'sin asignar'
                return (
                  <div key={routine.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50">
                    <Link href={`/coach/routines/${routine.id}/edit`} className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{routine.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {owner ? (athleteName.get(owner.athleteId) ?? 'Alumno') : 'Sin alumno'}
                        {' · '}
                        <span className={owner?.status === 'active' ? 'text-success' : undefined}>{status}</span>
                        {' · '}
                        {metaOf(routine)}
                      </p>
                    </Link>
                    <DeleteRoutineButton routineId={routine.id} routineName={routine.name} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

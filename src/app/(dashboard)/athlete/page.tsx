import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dumbbell, ArrowRight, ChevronRight, CheckCircle } from 'lucide-react'
import { weekdayName } from '@/lib/weekdays'
import { formatReps, scheduleForWeek } from '@/lib/validations/routine'

const CATEGORY_LABELS: Record<string, string> = {
  squat: 'Sentadilla',
  bench: 'Banca',
  deadlift: 'Peso muerto',
  accessory: 'Accesorio',
  olympic: 'Olímpico',
  other: 'Otro',
}

export default async function AthleteTodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: routine } = await supabase
    .from('athlete_routines')
    .select(`
      id,
      current_week,
      current_day,
      status,
      routine:routines (
        id,
        name,
        structure
      )
    `)
    .eq('athlete_id', user.id)
    .in('status', ['active', 'completed'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const structure = (routine as any)?.routine?.structure
  if (!routine || !structure?.schedule) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Dumbbell className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No hay entrenamiento programado</h2>
        <p className="text-muted-foreground mb-6">
          No tenés una rutina activa asignada para hoy.
        </p>
        <Link href="/athlete/log">
          <Button>Ir a registrar series</Button>
        </Link>
      </div>
    )
  }

  const todaySchedule = scheduleForWeek(structure, routine.current_week).find(
    (d: any) => d.day === routine.current_day
  )

  if (!todaySchedule) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Dumbbell className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No hay entrenamiento programado</h2>
        <p className="text-muted-foreground mb-6">
          No tenés una rutina activa asignada para hoy.
        </p>
        <Link href="/athlete/log">
          <Button>Ir a registrar series</Button>
        </Link>
      </div>
    )
  }

  const exerciseIds = todaySchedule.exercises.map((e: any) => e.exercise_id)

  const [{ data: exercises }, { data: setsLogged }] = await Promise.all([
    supabase
      .from('exercises')
      .select('id, name, category')
      .in('id', exerciseIds),
    supabase
      .from('sets_log')
      .select('id')
      .eq('athlete_id', user.id)
      .eq('athlete_routine_id', routine.id)
      .eq('week', routine.current_week)
      .eq('day', routine.current_day),
  ])

  const exerciseMap = new Map(exercises?.map(e => [e.id, e]) || [])

  const dayExercises = todaySchedule.exercises.map((e: any) => {
    const ex = exerciseMap.get(e.exercise_id)
    return {
      exercise_id: e.exercise_id,
      exercise_name: ex?.name || 'Ejercicio',
      category: ex?.category || 'other',
      sets: e.sets,
      reps: formatReps(e),
      intensity: e.intensity,
      rpe_target: e.rpe_target,
      rest_seconds: e.rest_seconds,
    }
  })

  const totalSets = dayExercises.reduce((sum: number, e: any) => sum + e.sets, 0)
  const loggedCount = setsLogged?.length || 0
  const completedToday = loggedCount >= totalSets && totalSets > 0
  const pct = totalSets > 0 ? Math.min(100, Math.round((loggedCount / totalSets) * 100)) : 0

  const logHref = (exerciseId: string) =>
    `/athlete/log?exercise=${exerciseId}&week=${routine.current_week}&day=${routine.current_day}`

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Hoy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {(routine as any).routine?.name} · Semana {routine.current_week} · {weekdayName(routine.current_day)}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {loggedCount}
            <span className="text-muted-foreground">/{totalSets}</span>
          </p>
          <p className={`text-sm font-medium ${completedToday ? 'text-success' : 'text-muted-foreground'}`}>
            {completedToday ? 'Completo' : 'series'}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${completedToday ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Ejercicios</h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {dayExercises.map((exercise: any) => {
            const spec = [
              `${exercise.sets} × ${exercise.reps}`,
              exercise.intensity || null,
              exercise.rpe_target ? `RPE ${exercise.rpe_target}` : null,
              exercise.rest_seconds
                ? `desc. ${Math.floor(exercise.rest_seconds / 60)}:${String(exercise.rest_seconds % 60).padStart(2, '0')}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')

            return (
              <Link
                key={exercise.exercise_id}
                href={logHref(exercise.exercise_id)}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{exercise.exercise_name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {CATEGORY_LABELS[exercise.category] ?? 'Otro'} ·{' '}
                    <span className="font-mono tabular-nums">{spec}</span>
                  </p>
                </div>
                {completedToday ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {completedToday ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl bg-card px-6 py-8 text-center ring-1 ring-foreground/10 duration-500">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle className="h-5 w-5" />
          </div>
          <p className="font-semibold text-foreground">¡Entrenamiento completado! Bien hecho.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Un día más cerca de tu objetivo. Así se construye el progreso.
          </p>
          <Link href="/athlete/progress">
            <Button variant="outline" className="mt-4">Ver mi progreso</Button>
          </Link>
        </div>
      ) : (
        dayExercises[0] && (
          <Link href={logHref(dayExercises[0].exercise_id)}>
            <Button size="lg" className="h-11 w-full text-base">
              {loggedCount > 0 ? 'Continuar' : 'Empezar'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )
      )}
    </div>
  )
}

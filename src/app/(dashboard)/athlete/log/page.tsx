'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, Loader2, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ExerciseFeedback } from '@/components/athlete/exercise-feedback'
import { ExerciseLogCard, type LoggedSet, type Prescription } from '@/components/athlete/exercise-log-card'
import { ExtraDayDialog } from '@/components/athlete/extra-day-dialog'
import { weekdayName, weekdayShort } from '@/lib/weekdays'
import { scheduleForWeek, type RoutineStructure } from '@/lib/validations/routine'
import { exerciseCompliance } from '@/lib/calculations/compliance'
import { dateForWeekDay, isToday } from '@/lib/schedule-dates'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DayData {
  week: number
  day: number
  name: string
  exercises: Prescription[]
}

const setsKey = (week: number, day: number, exerciseId: string) => `${week}-${day}-${exerciseId}`

type Supabase = ReturnType<typeof createClient>

// Active routine + logged sets + prefill data. Returns null when there's no active routine.
async function loadWorkout(supabase: Supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: routine } = await supabase
    .from('athlete_routines')
    .select('id, current_week, current_day, started_at, routine:routines(structure)')
    .eq('athlete_id', user.id)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Many-to-one join: Supabase returns an object, untyped client infers an array
  const structure = (routine?.routine as unknown as { structure: RoutineStructure } | null)?.structure
  if (!routine || !structure?.schedule?.length) return null

  const allSchedules = [structure.schedule, ...(structure.week_plans ?? []).map(p => p.schedule)]
  const exerciseIds = [...new Set(allSchedules.flatMap(s => s.flatMap(d => d.exercises.map(e => e.exercise_id))))]
  const [{ data: exercises }, { data: sets }, { data: history }, { data: estimates }] = await Promise.all([
    supabase.from('exercises').select('id, name').in('id', exerciseIds),
    supabase
      .from('sets_log')
      .select('week, day, exercise_id, set_number, reps, weight_kg, rpe, completed_at, extra_type')
      .eq('athlete_routine_id', routine.id),
    // Last weight used per exercise (any routine) to prefill
    supabase
      .from('sets_log')
      .select('exercise_id, weight_kg')
      .eq('athlete_id', user.id)
      .in('exercise_id', exerciseIds)
      .order('completed_at', { ascending: false })
      .limit(500),
    supabase.from('estimated_1rm').select('exercise_id, estimated_1rm').eq('athlete_id', user.id).in('exercise_id', exerciseIds),
  ])

  const nameById = new Map(exercises?.map(e => [e.id, e.name as string]) ?? [])

  // One entry per session across all weeks, so prev/next can move between weeks
  const days: DayData[] = Array.from({ length: structure.weeks || 1 }, (_, i) => i + 1).flatMap(week =>
    [...scheduleForWeek(structure, week)].sort((a, b) => a.day - b.day).map(d => ({
      week,
      day: d.day,
      name: d.name,
      exercises: [...d.exercises]
        .sort((a, b) => a.order - b.order)
        .map(e => ({
          exercise_id: e.exercise_id,
          exercise_name: nameById.get(e.exercise_id) ?? 'Ejercicio',
          sets: e.sets,
          reps: e.reps,
          reps_max: e.reps_max,
          load_type: e.load_type,
          load_value: e.load_value,
          rpe_target: e.rpe_target,
          rest_seconds: e.rest_seconds,
          note: e.note,
        })),
    }))
  )
  const target = days.findIndex(d => d.week === routine.current_week && d.day === routine.current_day)

  const setsByKey: Record<string, LoggedSet[]> = {}
  for (const s of sets ?? []) {
    const key = setsKey(s.week, s.day, s.exercise_id)
    ;(setsByKey[key] ??= []).push({ set_number: s.set_number, reps: s.reps, weight_kg: Number(s.weight_kg), rpe: s.rpe })
  }
  Object.values(setsByKey).forEach(list => list.sort((a, b) => a.set_number - b.set_number))

  // Real date the athlete actually logged each session, falling back to the
  // theoretical schedule date for sessions not done yet — training a day's
  // content on a different real calendar day than pautado is expected now.
  const realDateByDay: Record<string, Date> = {}
  for (const s of sets ?? []) {
    // A freeform "día extra" exercise is tagged with the pending day's week/day
    // but isn't actually that day's prescribed content — it shouldn't mark the
    // real session as logged.
    if (s.extra_type === 'freeform') continue
    const key = `${s.week}-${s.day}`
    const completed = new Date(s.completed_at)
    if (!realDateByDay[key] || completed < realDateByDay[key]) realDateByDay[key] = completed
  }

  const lastWeight = new Map<string, number>()
  for (const h of history ?? []) if (!lastWeight.has(h.exercise_id)) lastWeight.set(h.exercise_id, Number(h.weight_kg))

  const best = new Map<string, number>()
  for (const e of estimates ?? []) best.set(e.exercise_id, Math.max(best.get(e.exercise_id) ?? 0, Number(e.estimated_1rm)))

  return {
    session: { userId: user.id, athleteRoutineId: routine.id as string },
    startedAt: routine.started_at as string,
    days,
    currentIndex: target >= 0 ? target : 0,
    setsByKey,
    realDateByDay,
    lastWeight,
    best,
  }
}

export default function AthleteLogPage() {
  const [supabase] = useState(() => createClient())

  const [days, setDays] = useState<DayData[]>([])
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [pointerIndex, setPointerIndex] = useState(0)
  const [weekProgress, setWeekProgress] = useState<{ currentWeekDays: number; currentWeekRequired: number } | null>(null)
  const [extraDayOpen, setExtraDayOpen] = useState(false)
  const [setsByKey, setSetsByKey] = useState<Record<string, LoggedSet[]>>({})
  const [realDateByDay, setRealDateByDay] = useState<Record<string, Date>>({})
  const [e1rmByExercise, setE1rmByExercise] = useState<Map<string, number>>(new Map())
  const [lastWeightByExercise, setLastWeightByExercise] = useState<Map<string, number>>(new Map())
  const [session, setSession] = useState<{ userId: string; athleteRoutineId: string } | null>(null)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [noRoutine, setNoRoutine] = useState(false)

  async function refresh(showSpinner: boolean, resetIndex: boolean = true) {
    if (showSpinner) setLoading(true)
    try {
      const [result, weekRes] = await Promise.all([
        loadWorkout(supabase),
        fetch('/api/stats/adherence?weeks=1').then(r => (r.ok ? r.json() : null)).catch(() => null),
      ])
      if (!result) {
        setNoRoutine(true)
        return
      }
      setSession(result.session)
      setStartedAt(result.startedAt)
      setDays(result.days)
      if (resetIndex) setCurrentDayIndex(result.currentIndex)
      setPointerIndex(result.currentIndex)
      setSetsByKey(result.setsByKey)
      setRealDateByDay(result.realDateByDay)
      setLastWeightByExercise(result.lastWeight)
      setE1rmByExercise(result.best)
      if (weekRes) setWeekProgress({ currentWeekDays: weekRes.currentWeekDays, currentWeekRequired: weekRes.currentWeekRequired })
    } catch (error) {
      console.error('Error loading workout:', error)
      toast.error('Error cargando el entrenamiento')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    refresh(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const currentDay = days[currentDayIndex]
  const doneCount = currentDay ? currentDay.exercises.filter(e => setsByKey[setsKey(currentDay.week, currentDay.day, e.exercise_id)]?.length).length : 0
  const total = currentDay ? currentDay.exercises.length : 0
  const currentLoggedFlag = currentDay ? `${currentDay.week}-${currentDay.day}` in realDateByDay : false
  const showExtraDayPrompt =
    !!weekProgress &&
    currentDayIndex === pointerIndex &&
    !currentLoggedFlag &&
    weekProgress.currentWeekDays >= weekProgress.currentWeekRequired
  const allDone = total > 0 && doneCount === total

  // Finishing a day moves current_week/current_day server-side right away
  // (advance_athlete_routine trigger) and can push this real week past its
  // target — refetch so pointerIndex/weekProgress aren't stale by the time
  // the athlete looks at the next session.
  const refreshedForDay = useRef<string | null>(null)
  useEffect(() => {
    if (!currentDay) return
    const key = `${currentDay.week}-${currentDay.day}`
    if (allDone && !currentLoggedFlag && refreshedForDay.current !== key) {
      refreshedForDay.current = key
      refresh(false, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, currentLoggedFlag, currentDay?.week, currentDay?.day])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (noRoutine || !currentDay || !session) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Todavía no tienes una rutina activa. Tu coach te la va a asignar.
        </CardContent>
      </Card>
    )
  }

  function saveSets(exerciseId: string, sets: LoggedSet[]) {
    setSetsByKey(prev => ({ ...prev, [setsKey(currentDay.week, currentDay.day, exerciseId)]: sets }))
    if (sets.length) {
      const last = sets.at(-1)!.weight_kg
      setLastWeightByExercise(prev => new Map(prev).set(exerciseId, last))
    }
  }

  const goTo = (index: number) => {
    setCurrentDayIndex(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Real date the session actually happened on (from completed_at), or the
  // theoretical pautado date while it's still pending. The athlete can train
  // a day's content on any real day, in order, so the real one wins once set.
  const dateOf = (w: number, d: number) =>
    realDateByDay[`${w}-${d}`] ?? (startedAt ? dateForWeekDay(startedAt, w, d) : null)
  const isLogged = (w: number, d: number) => `${w}-${d}` in realDateByDay
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const currentDate = dateOf(currentDay.week, currentDay.day)
  const currentLogged = isLogged(currentDay.week, currentDay.day)

  return (
    <div className="space-y-6 pb-8">
      {/* Session navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => goTo(currentDayIndex - 1)} disabled={currentDayIndex === 0} aria-label="Sesión anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Semana {currentDay.week}</p>
          <p className="text-2xl font-extrabold tracking-tight text-foreground">
            {currentDate && currentLogged ? capitalize(format(currentDate, 'EEEE', { locale: es })) : weekdayName(currentDay.day)}
          </p>
          {currentDate && (
            <p className="text-sm text-muted-foreground">
              {format(currentDate, "d 'de' MMMM", { locale: es })}
              {!currentLogged && ' · pautado'}
            </p>
          )}
          {currentDay.name && currentDay.name !== weekdayName(currentDay.day) && (
            <p className="text-sm text-muted-foreground">{currentDay.name}</p>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => goTo(currentDayIndex + 1)} disabled={currentDayIndex === days.length - 1} aria-label="Sesión siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center gap-2">
        {days.map((d, i) => {
          if (d.week !== currentDay.week) return null
          const chipDate = dateOf(d.week, d.day)
          const todayChip = chipDate ? isToday(chipDate) : false
          return (
            <button
              key={`${d.week}-${d.day}`}
              onClick={() => goTo(i)}
              title={chipDate ? format(chipDate, "d 'de' MMMM", { locale: es }) : undefined}
              className={cn(
                'relative flex h-11 min-w-11 flex-col items-center justify-center gap-0 rounded-full px-2 text-sm font-medium leading-none transition-colors',
                i === currentDayIndex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                todayChip && i !== currentDayIndex && 'ring-2 ring-primary/40'
              )}
            >
              <span>{isLogged(d.week, d.day) && chipDate ? capitalize(format(chipDate, 'EEEEEE', { locale: es })) : weekdayShort(d.day)}</span>
              {chipDate && (
                <span className={cn('text-[10px] font-normal', i === currentDayIndex ? 'opacity-80' : 'opacity-60')}>
                  {format(chipDate, 'd')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">{doneCount} de {total} ejercicios hechos</span>
          <span className="font-mono tabular-nums text-muted-foreground">{total ? Math.round((doneCount / total) * 100) : 0}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full transition-all duration-500 ease-out ${allDone ? 'bg-success' : 'bg-primary'}`} style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>
      </div>

      {allDone && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 border-success/20 bg-success/5 duration-500">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/15">
              <PartyPopper className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-success">¡Entrenamiento completo!</p>
              <p className="text-sm text-muted-foreground">Tu coach ya puede ver lo que hiciste. Así se construye el progreso.</p>
            </div>
            {currentDayIndex < days.length - 1 && (
              <Button variant="outline" onClick={() => goTo(currentDayIndex + 1)}>
                Ver el próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showExtraDayPrompt && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-3 py-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">¡Ya cumpliste tus días de esta semana!</p>
              <p className="text-sm text-muted-foreground">¿Querés entrenar de nuevo? Elegí cómo contarlo.</p>
            </div>
            <Button onClick={() => setExtraDayOpen(true)}>Elegir</Button>
          </CardContent>
        </Card>
      )}

      {session && (
        <ExtraDayDialog
          open={extraDayOpen}
          onOpenChange={setExtraDayOpen}
          exercises={currentDay.exercises}
          athleteId={session.userId}
          athleteRoutineId={session.athleteRoutineId}
          week={currentDay.week}
          day={currentDay.day}
          setsByKey={setsByKey}
          e1rmByExercise={e1rmByExercise}
          lastWeightByExercise={lastWeightByExercise}
          onExerciseSaved={saveSets}
          onDone={() => refresh(false)}
        />
      )}

      <div className="space-y-4">
        {currentDay.exercises.map(exercise => (
          <ExerciseLogCard
            key={`${currentDay.week}-${currentDay.day}-${exercise.exercise_id}`}
            prescription={exercise}
            logged={setsByKey[setsKey(currentDay.week, currentDay.day, exercise.exercise_id)] ?? []}
            e1rm={e1rmByExercise.get(exercise.exercise_id) ?? null}
            lastWeight={lastWeightByExercise.get(exercise.exercise_id) ?? null}
            session={{ athleteId: session.userId, athleteRoutineId: session.athleteRoutineId, week: currentDay.week, day: currentDay.day }}
            onSaved={sets => saveSets(exercise.exercise_id, sets)}
          >
            <ExerciseFeedback
              athleteId={session.userId}
              athleteRoutineId={session.athleteRoutineId}
              exerciseId={exercise.exercise_id}
              week={currentDay.week}
              day={currentDay.day}
              partial={exerciseCompliance(exercise, setsByKey[setsKey(currentDay.week, currentDay.day, exercise.exercise_id)] ?? []) === 'partial'}
            />
          </ExerciseLogCard>
        ))}
      </div>
    </div>
  )
}

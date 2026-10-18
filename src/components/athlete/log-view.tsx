'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, Loader2, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ExerciseFeedback } from '@/components/athlete/exercise-feedback'
import { ExerciseLogCard, type LoggedSet, type Prescription } from '@/components/athlete/exercise-log-card'
import { ExtraDayDialog } from '@/components/athlete/extra-day-dialog'
import { weekdayName, weekdayShort } from '@/lib/weekdays'
import { exerciseCompliance } from '@/lib/calculations/compliance'
import { dateForWeekDay, isToday } from '@/lib/schedule-dates'
import { celebrateNewMilestones } from '@/lib/celebrate-milestones'
import { loadWorkout, setsKey, type DayData, type WorkoutData } from '@/lib/load-workout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LogViewProps {
  initialData: WorkoutData | null
}

export function LogView({ initialData }: LogViewProps) {
  const [supabase] = useState(() => createClient())

  const [days, setDays] = useState<DayData[]>(initialData?.days ?? [])
  const [currentDayIndex, setCurrentDayIndex] = useState(initialData?.currentIndex ?? 0)
  const [pointerIndex, setPointerIndex] = useState(initialData?.currentIndex ?? 0)
  const [weekProgress, setWeekProgress] = useState<{ currentWeekDays: number; currentWeekRequired: number } | null>(null)
  const [extraDayOpen, setExtraDayOpen] = useState(false)
  const [setsByKey, setSetsByKey] = useState<Record<string, LoggedSet[]>>(initialData?.setsByKey ?? {})
  const [realDateByDay, setRealDateByDay] = useState<Record<string, string>>(initialData?.realDateByDay ?? {})
  const [e1rmByExercise, setE1rmByExercise] = useState<Record<string, number>>(initialData?.best ?? {})
  const [lastWeightByExercise, setLastWeightByExercise] = useState<Record<string, number>>(initialData?.lastWeight ?? {})
  const [lastRepsByExercise, setLastRepsByExercise] = useState<Record<string, number>>(initialData?.lastReps ?? {})
  const [session, setSession] = useState<{ userId: string; athleteRoutineId: string } | null>(initialData?.session ?? null)
  const [startedAt, setStartedAt] = useState<string | null>(initialData?.startedAt ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [noRoutine, setNoRoutine] = useState(initialData === null && !loading)

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
      setLastRepsByExercise(result.lastReps)
      setE1rmByExercise(result.best)
      if (weekRes) {
        setWeekProgress({ currentWeekDays: weekRes.currentWeekDays, currentWeekRequired: weekRes.currentWeekRequired })
        celebrateNewMilestones(weekRes.unlockedCards ?? [], result.session.userId)
      }
    } catch (error) {
      console.error('Error loading workout:', error)
      toast.error('Error cargando el entrenamiento')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    if (initialData) {
      fetch('/api/stats/adherence?weeks=1').then(r => (r.ok ? r.json() : null)).then(weekRes => {
        if (weekRes) {
          setWeekProgress({ currentWeekDays: weekRes.currentWeekDays, currentWeekRequired: weekRes.currentWeekRequired })
          if (initialData.session) celebrateNewMilestones(weekRes.unlockedCards ?? [], initialData.session.userId)
        }
      }).catch(() => {})
    } else {
      refresh(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => {
    if (!currentDay) return
    const firstPending = currentDay.exercises.find(e => !setsByKey[setsKey(currentDay.week, currentDay.day, e.exercise_id)]?.length)
    setOpenId(firstPending?.exercise_id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDay?.week, currentDay?.day, loading])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (noRoutine || !currentDay || !session) {
    return (
      <div className="rounded-xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        Todavía no tenés una rutina activa. Tu coach te la va a asignar.
      </div>
    )
  }

  function saveSets(exerciseId: string, sets: LoggedSet[]) {
    setSetsByKey(prev => ({ ...prev, [setsKey(currentDay.week, currentDay.day, exerciseId)]: sets }))
    if (sets.length) {
      const last = sets.at(-1)!.weight_kg
      setLastWeightByExercise(prev => ({ ...prev, [exerciseId]: last }))
    }
    const next = currentDay.exercises.find(
      e => e.exercise_id !== exerciseId && !setsByKey[setsKey(currentDay.week, currentDay.day, e.exercise_id)]?.length
    )
    setOpenId(sets.length ? (next?.exercise_id ?? null) : exerciseId)
  }

  const goTo = (index: number) => {
    setCurrentDayIndex(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const dateOf = (w: number, d: number) => {
    const iso = realDateByDay[`${w}-${d}`]
    if (iso) return new Date(iso)
    return startedAt ? dateForWeekDay(startedAt, w, d) : null
  }
  const isLogged = (w: number, d: number) => `${w}-${d}` in realDateByDay
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const currentDate = dateOf(currentDay.week, currentDay.day)
  const currentLogged = isLogged(currentDay.week, currentDay.day)

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => goTo(currentDayIndex - 1)} disabled={currentDayIndex === 0} aria-label="Sesión anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Semana {currentDay.week}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {currentDate && currentLogged ? capitalize(format(currentDate, 'EEEE', { locale: es })) : weekdayName(currentDay.day)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentDate && format(currentDate, "d 'de' MMMM", { locale: es })}
            {currentDate && !currentLogged && ' · pautado'}
            {currentDay.name && currentDay.name !== weekdayName(currentDay.day) && `${currentDate ? ' · ' : ''}${currentDay.name}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goTo(currentDayIndex + 1)} disabled={currentDayIndex === days.length - 1} aria-label="Sesión siguiente">
          <ChevronRight className="h-5 w-5" />
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

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-foreground">{doneCount} de {total} ejercicios</span>
          {allDone && <span className="font-medium text-success">Completo</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full transition-all duration-500 ease-out ${allDone ? 'bg-success' : 'bg-primary'}`} style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>
      </div>

      {allDone && (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col items-center gap-3 rounded-xl bg-card px-5 py-5 text-center ring-1 ring-success/30 duration-500 sm:flex-row sm:text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success/15">
            <PartyPopper className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">¡Entrenamiento completo!</p>
            <p className="text-sm text-muted-foreground">Tu coach ya puede ver lo que hiciste.</p>
          </div>
          {currentDayIndex < days.length - 1 && (
            <Button variant="outline" onClick={() => goTo(currentDayIndex + 1)}>
              Ver el próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {showExtraDayPrompt && (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card px-5 py-5 text-center ring-1 ring-primary/30 sm:flex-row sm:text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
            <Flame className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">¡Ya cumpliste tus días de esta semana!</p>
            <p className="text-sm text-muted-foreground">¿Querés entrenar de nuevo? Elegí cómo contarlo.</p>
          </div>
          <Button onClick={() => setExtraDayOpen(true)}>Elegir</Button>
        </div>
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

      <div className="space-y-3">
        {currentDay.exercises.map(exercise => (
          <ExerciseLogCard
            key={`${currentDay.week}-${currentDay.day}-${exercise.exercise_id}`}
            prescription={exercise}
            logged={setsByKey[setsKey(currentDay.week, currentDay.day, exercise.exercise_id)] ?? []}
            e1rm={e1rmByExercise[exercise.exercise_id] ?? null}
            lastWeight={lastWeightByExercise[exercise.exercise_id] ?? null}
            lastReps={lastRepsByExercise[exercise.exercise_id] ?? null}
            session={{ athleteId: session.userId, athleteRoutineId: session.athleteRoutineId, week: currentDay.week, day: currentDay.day }}
            onSaved={sets => saveSets(exercise.exercise_id, sets)}
            expanded={openId === exercise.exercise_id}
            onToggle={() => setOpenId(id => (id === exercise.exercise_id ? null : exercise.exercise_id))}
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

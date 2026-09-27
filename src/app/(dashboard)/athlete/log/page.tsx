'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ExerciseFeedback } from '@/components/athlete/exercise-feedback'
import { ExerciseLogCard, type LoggedSet, type Prescription } from '@/components/athlete/exercise-log-card'
import { weekdayName, weekdayShort } from '@/lib/weekdays'
import { scheduleForWeek, type RoutineStructure } from '@/lib/validations/routine'

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
    .select('id, current_week, current_day, routine:routines(structure)')
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
      .select('week, day, exercise_id, set_number, reps, weight_kg, rpe')
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

  const lastWeight = new Map<string, number>()
  for (const h of history ?? []) if (!lastWeight.has(h.exercise_id)) lastWeight.set(h.exercise_id, Number(h.weight_kg))

  const best = new Map<string, number>()
  for (const e of estimates ?? []) best.set(e.exercise_id, Math.max(best.get(e.exercise_id) ?? 0, Number(e.estimated_1rm)))

  return {
    session: { userId: user.id, athleteRoutineId: routine.id as string },
    days,
    currentIndex: target >= 0 ? target : 0,
    setsByKey,
    lastWeight,
    best,
  }
}

export default function AthleteLogPage() {
  const [supabase] = useState(() => createClient())

  const [days, setDays] = useState<DayData[]>([])
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [setsByKey, setSetsByKey] = useState<Record<string, LoggedSet[]>>({})
  const [e1rmByExercise, setE1rmByExercise] = useState<Map<string, number>>(new Map())
  const [lastWeightByExercise, setLastWeightByExercise] = useState<Map<string, number>>(new Map())
  const [session, setSession] = useState<{ userId: string; athleteRoutineId: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [noRoutine, setNoRoutine] = useState(false)

  useEffect(() => {
    let active = true
    loadWorkout(supabase)
      .then(result => {
        if (!active) return
        if (!result) {
          setNoRoutine(true)
          return
        }
        setSession(result.session)
        setDays(result.days)
        setCurrentDayIndex(result.currentIndex)
        setSetsByKey(result.setsByKey)
        setLastWeightByExercise(result.lastWeight)
        setE1rmByExercise(result.best)
      })
      .catch(error => {
        console.error('Error loading workout:', error)
        toast.error('Error cargando el entrenamiento')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentDay = days[currentDayIndex]
  if (noRoutine || !currentDay || !session) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Todavía no tienes una rutina activa. Tu coach te la va a asignar.
        </CardContent>
      </Card>
    )
  }

  const doneCount = currentDay.exercises.filter(e => setsByKey[setsKey(currentDay.week, currentDay.day, e.exercise_id)]?.length).length
  const total = currentDay.exercises.length
  const allDone = total > 0 && doneCount === total

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

  return (
    <div className="space-y-6 pb-8">
      {/* Session navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => goTo(currentDayIndex - 1)} disabled={currentDayIndex === 0} aria-label="Sesión anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm text-gray-500">Semana {currentDay.week}</p>
          <p className="text-2xl font-bold text-gray-900">{weekdayName(currentDay.day)}</p>
          {currentDay.name && currentDay.name !== weekdayName(currentDay.day) && (
            <p className="text-sm text-gray-600">{currentDay.name}</p>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => goTo(currentDayIndex + 1)} disabled={currentDayIndex === days.length - 1} aria-label="Sesión siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center gap-2">
        {days.map((d, i) =>
          d.week !== currentDay.week ? null : (
            <button
              key={`${d.week}-${d.day}`}
              onClick={() => goTo(i)}
              className={cn(
                'h-9 min-w-9 rounded-full px-2 text-sm font-medium transition-colors',
                i === currentDayIndex ? 'bg-primary text-primary-foreground' : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {weekdayShort(d.day)}
            </button>
          )
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">{doneCount} de {total} ejercicios hechos</span>
          <span className="text-gray-500">{total ? Math.round((doneCount / total) * 100) : 0}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>
      </div>

      {allDone && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:text-left">
            <PartyPopper className="h-8 w-8 text-green-600" />
            <div className="flex-1">
              <p className="font-semibold text-green-800">¡Entrenamiento completo!</p>
              <p className="text-sm text-green-700">Tu coach ya puede ver lo que hiciste.</p>
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
            />
          </ExerciseLogCard>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Dumbbell, Calendar, Clock, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TodayWorkout {
  athlete_routine: {
    id: string
    current_week: number
    current_day: number
    status: string
    routine: {
      id: string
      name: string
      structure: any
    }
  }
  dayExercises: Array<{
    exercise_id: string
    exercise_name: string
    category: string
    sets: number
    reps: number
    intensity: string
    rpe_target: number
    rest_seconds?: number
  }>
  completedToday: boolean
  setsLogged: number
  totalSets: number
}

export default function AthleteTodayPage() {
  const [workout, setWorkout] = useState<TodayWorkout | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodaysWorkout()
  }, [])

  async function fetchTodaysWorkout() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get active athlete routine
      const { data: routine, error: routineError } = await supabase
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
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()

      if (routineError || !routine) {
        setWorkout(null)
        setLoading(false)
        return
      }

      const structure = (routine as any).routine?.structure
      if (!structure?.schedule) {
        setWorkout(null)
        setLoading(false)
        return
      }

      // Find today's day in schedule
      const todaySchedule = structure.schedule.find(
        (d: any) => d.day === routine.current_day
      )

      if (!todaySchedule) {
        setWorkout(null)
        setLoading(false)
        return
      }

      // Get exercises for today
      const exerciseIds = todaySchedule.exercises.map((e: any) => e.exercise_id)
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name, category')
        .in('id', exerciseIds)

      const exerciseMap = new Map(exercises?.map(e => [e.id, e]) || [])

      const dayExercises = todaySchedule.exercises.map((e: any) => {
        const ex = exerciseMap.get(e.exercise_id)
        return {
          exercise_id: e.exercise_id,
          exercise_name: ex?.name || 'Ejercicio',
          category: ex?.category || 'other',
          sets: e.sets,
          reps: e.reps,
          intensity: e.intensity,
          rpe_target: e.rpe_target,
          rest_seconds: e.rest_seconds,
        }
      })

      // Check if already logged today
      const { data: setsLogged } = await supabase
        .from('sets_log')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('athlete_routine_id', routine.id)
        .eq('week', routine.current_week)
        .eq('day', routine.current_day)

      const totalSets = dayExercises.reduce((sum, e) => sum + e.sets, 0)
      const loggedCount = setsLogged?.length || 0

      setWorkout({
        athlete_routine: routine,
        dayExercises,
        completedToday: loggedCount >= totalSets && totalSets > 0,
        setsLogged: loggedCount,
        totalSets,
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="text-center py-16">
        <Dumbbell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay entrenamiento programado</h2>
        <p className="text-gray-500 mb-6">
          No tienes una rutina activa asignada para hoy.
        </p>
        <Link href="/athlete/log">
          <Button>Ir a registrar series</Button>
        </Link>
      </div>
    )
  }

  const { athlete_routine, dayExercises, completedToday, setsLogged, totalSets } = workout

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entrenamiento de Hoy</h1>
          <p className="text-gray-500 mt-1">
            {athlete_routine.routine?.name} - Semana {athlete_routine.current_week}, Día {athlete_routine.current_day}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={completedToday ? 'default' : 'secondary'} className="text-lg px-3 py-1">
            {completedToday ? (
              <> <CheckCircle className="mr-1 h-4 w-4" /> Completado </>
            ) : (
              <> {setsLogged}/{totalSets} series </>
            )}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dayExercises.map((exercise, index) => (
          <Card key={exercise.exercise_id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{exercise.exercise_name}</CardTitle>
                <Badge variant="outline" className="capitalize">{exercise.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{exercise.sets}</p>
                  <p className="text-gray-500">Series</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{exercise.reps}</p>
                  <p className="text-gray-500">Reps</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{exercise.intensity}</p>
                  <p className="text-gray-500">Intensidad</p>
                </div>
              </div>

              {exercise.rpe_target && (
                <div className="text-sm text-gray-600">
                  RPE objetivo: <span className="font-medium">{exercise.rpe_target}</span>
                </div>
              )}

              {exercise.rest_seconds && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Descanso: {Math.floor(exercise.rest_seconds / 60)}:{String(exercise.rest_seconds % 60).padStart(2, '0')}
                </div>
              )}

              <Link href={`/athlete/log?exercise=${exercise.exercise_id}&week=${athlete_routine.current_week}&day=${athlete_routine.current_day}`}>
                <Button className="w-full" variant={completedToday ? 'secondary' : 'default'}>
                  {completedToday ? 'Completado' : 'Registrar series'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {completedToday && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">¡Entrenamiento completado! Bien hecho.</span>
            </div>
            <div className="mt-4 text-center">
              <Link href="/athlete/progress">
                <Button variant="outline">Ver mi progreso</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
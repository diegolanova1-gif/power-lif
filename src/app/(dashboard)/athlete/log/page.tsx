'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Check, ChevronLeft, ChevronRight, Loader2, Save, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ExercisePrescription {
  exercise_id: string
  exercise_name: string
  category: string
  sets: number
  reps: number
  intensity: string
  rpe_target: number
}

interface SetLog {
  set_number: number
  weight_kg: number
  reps: number
  rpe: number | null
  rir: number | null
  notes: string
  completed: boolean
}

interface DayData {
  week: number
  day: number
  exercises: ExercisePrescription[]
}

export default function AthleteLogPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [days, setDays] = useState<DayData[]>([])
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [setsData, setSetsData] = useState<Record<string, SetLog[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Initialize from URL params
  useEffect(() => {
    const week = searchParams.get('week')
    const day = searchParams.get('day')
    const exerciseId = searchParams.get('exercise')
    
    if (week && day) {
      // Will be handled after days load
    }
  }, [searchParams])

  const fetchWorkoutPlan = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get active routine
      const { data: routine } = await supabase
        .from('athlete_routines')
        .select(`
          id,
          current_week,
          current_day,
          routine:routines (
            structure
          )
        `)
        .eq('athlete_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()

      if (!routine?.routine?.structure) {
        toast.error('No tienes rutina activa')
        setLoading(false)
        return
      }

      const structure = routine.routine.structure as any
      const schedule = structure.schedule || []

      // Get all exercises
      const exerciseIds = schedule.flatMap((d: any) => d.exercises.map((e: any) => e.exercise_id))
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name, category')
        .in('id', exerciseIds)

      const exerciseMap = new Map(exercises?.map(e => [e.id, e]) || [])

      const dayData: DayData[] = schedule.map((d: any) => ({
        week: d.week || 1,
        day: d.day,
        exercises: d.exercises.map((e: any) => {
          const ex = exerciseMap.get(e.exercise_id)
          return {
            exercise_id: e.exercise_id,
            exercise_name: ex?.name || 'Ejercicio',
            category: ex?.category || 'other',
            sets: e.sets,
            reps: e.reps,
            intensity: e.intensity,
            rpe_target: e.rpe_target,
          }
        }),
      }))

      setDays(dayData)

      // Set initial day index
      if (dayData.length > 0) {
        const targetDay = dayData.findIndex(d => d.day === routine.current_day)
        setCurrentDayIndex(targetDay >= 0 ? targetDay : 0)
      }

      // Load existing sets
      const { data: sets } = await supabase
        .from('sets_log')
        .select('*')
        .eq('athlete_id', user.id)
        .eq('athlete_routine_id', routine.id)

      if (sets) {
        const grouped: Record<string, SetLog[]> = {}
        sets.forEach(s => {
          const key = `${s.week}-${s.day}-${s.exercise_id}`
          if (!grouped[key]) grouped[key] = []
          grouped[key].push({
            set_number: s.set_number,
            weight_kg: s.weight_kg,
            reps: s.reps,
            rpe: s.rpe,
            rir: s.rir,
            notes: s.notes || '',
            completed: true,
          })
        })
        setSetsData(grouped)
      }
    } catch (error) {
      console.error(error)
      toast.error('Error cargando entrenamiento')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchWorkoutPlan()
  }, [fetchWorkoutPlan])

  const currentDay = days[currentDayIndex]

  const getSetsKey = (exerciseId: string) => {
    return `${currentDay?.week}-${currentDay?.day}-${exerciseId}`
  }

  const getExistingSets = (exerciseId: string) => {
    return setsData[getSetsKey(exerciseId)] || []
  }

  const updateSet = (exerciseId: string, setNumber: number, field: keyof SetLog, value: any) => {
    setSetsData(prev => {
      const key = getSetsKey(exerciseId)
      const existing = prev[key] || []
      const newSets = [...existing]
      const index = setNumber - 1
      
      if (index >= newSets.length) {
        // Add new set
        newSets[index] = {
          set_number: setNumber,
          weight_kg: 0,
          reps: 0,
          rpe: null,
          rir: null,
          notes: '',
          completed: false,
        }
      }
      
      newSets[index] = { ...newSets[index], [field]: value, completed: true }
      return { ...prev, [key]: newSets }
    })
  }

  const saveSets = async () => {
    if (!currentDay) return
    
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: routine } = await supabase
        .from('athlete_routines')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()

      if (!routine) throw new Error('Rutina no encontrada')

      const setsToInsert = []
      for (const exercise of currentDay.exercises) {
        const key = getSetsKey(exercise.exercise_id)
        const sets = setsData[key] || []
        sets.forEach(s => {
          if (s.completed && s.weight_kg > 0) {
            setsToInsert.push({
              athlete_routine_id: routine.id,
              exercise_id: exercise.exercise_id,
              week: currentDay.week,
              day: currentDay.day,
              set_number: s.set_number,
              weight_kg: s.weight_kg,
              reps: s.reps,
              rpe: s.rpe,
              rir: s.rir,
              notes: s.notes,
            })
          }
        })
      }

      if (setsToInsert.length === 0) {
        toast.error('No hay series para guardar')
        return
      }

      const { error } = await supabase
        .from('sets_log')
        .upsert(setsToInsert, {
          onConflict: 'athlete_routine_id,exercise_id,week,day,set_number',
        })

      if (error) throw error

      toast.success(`${setsToInsert.length} series guardadas`)
      
      // Refresh data
      fetchWorkoutPlan()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const goToDay = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentDayIndex > 0) {
      setCurrentDayIndex(i => i - 1)
    } else if (direction === 'next' && currentDayIndex < days.length - 1) {
      setCurrentDayIndex(i => i + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentDay) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay entrenamiento para este día</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Day Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => goToDay('prev')} disabled={currentDayIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm text-gray-500">Semana {currentDay.week}</p>
            <p className="text-2xl font-bold text-gray-900">Día {currentDay.day}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => goToDay('next')} disabled={currentDayIndex === days.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          {days.map((d, i) => (
            <button
              key={`${d.week}-${d.day}`}
              onClick={() => setCurrentDayIndex(i)}
              className={cn(
                'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                i === currentDayIndex
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {d.day}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-6">
        {currentDay.exercises.map((exercise) => {
          const existingSets = getExistingSets(exercise.exercise_id)
          
          return (
            <Card key={exercise.exercise_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-lg">{exercise.exercise_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">{exercise.category}</Badge>
                      <Badge variant="secondary">{exercise.sets}×{exercise.reps}</Badge>
                      <Badge variant="outline">{exercise.intensity}</Badge>
                      {exercise.rpe_target && <Badge variant="default">RPE {exercise.rpe_target}</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: exercise.sets }, (_, i) => {
                    const setNum = i + 1
                    const existing = existingSets.find(s => s.set_number === setNum) || {
                      set_number: setNum,
                      weight_kg: 0,
                      reps: 0,
                      rpe: null,
                      rir: null,
                      notes: '',
                      completed: false,
                    }

                    return (
                      <div key={setNum} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                        <Label className="col-span-12 sm:col-span-1 text-right sm:text-left font-medium text-gray-700">
                          Serie {setNum}
                        </Label>
                        
                        <div className="col-span-12 sm:col-span-3">
                          <Label className="block text-xs text-gray-500 mb-1">Peso (kg)</Label>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            max="500"
                            value={existing.weight_kg || ''}
                            onChange={e => updateSet(exercise.exercise_id, setNum, 'weight_kg', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className={cn('font-mono text-lg', existing.completed ? 'bg-white' : '')}
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-2">
                          <Label className="block text-xs text-gray-500 mb-1">Reps</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={existing.reps || ''}
                            onChange={e => updateSet(exercise.exercise_id, setNum, 'reps', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className={cn('font-mono text-lg', existing.completed ? 'bg-white' : '')}
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-3">
                          <Label className="block text-xs text-gray-500 mb-1">RPE</Label>
                          <Slider
                            value={existing.rpe ? [existing.rpe] : [0]}
                            onValueChange={([val]) => updateSet(exercise.exercise_id, setNum, 'rpe', val || null)}
                            max={10}
                            step={0.5}
                            min={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>1</span>
                            <span>{existing.rpe?.toFixed(1) || '-'}</span>
                            <span>10</span>
                          </div>
                        </div>

                        <div className="col-span-12 sm:col-span-3">
                          <Label className="block text-xs text-gray-500 mb-1">RIR (opcional)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            value={existing.rir ?? ''}
                            onChange={e => updateSet(exercise.exercise_id, setNum, 'rir', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="0"
                            className={cn('font-mono', existing.completed ? 'bg-white' : '')}
                          />
                        </div>

                        <div className="col-span-12">
                          <Label className="block text-xs text-gray-500 mb-1">Notas</Label>
                          <Textarea
                            value={existing.notes}
                            onChange={e => updateSet(exercise.exercise_id, setNum, 'notes', e.target.value)}
                            placeholder="Notas sobre la serie..."
                            rows={1}
                            className="text-sm"
                          />
                        </div>

                        {existing.completed && (
                          <div className="col-span-12 sm:col-auto flex justify-end">
                            <Check className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm py-4 border-t">
        <Button 
          onClick={saveSets} 
          disabled={saving}
          className="w-full sm:w-auto"
          size="lg"
        >
          {saving ? (
            <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando... </>
          ) : (
            <> <Save className="mr-2 h-4 w-4" /> Guardar Series </>
          )}
        </Button>
      </div>
    </div>
  )
}
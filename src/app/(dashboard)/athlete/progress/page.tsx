'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

interface OneRMDataPoint {
  date: string
  estimated_1rm: number
  exercise_name: string
  category: string
}

interface ExerciseOneRM {
  exercise_id: string
  exercise_name: string
  category: string
  dataPoints: OneRMDataPoint[]
}

interface VolumeDataPoint {
  week: number
  volume: number
}

interface AdherenceDataPoint {
  date: string
  completed: boolean
  intensity?: number
}

interface Exercise {
  id: string
  name: string
  category: string
}

export default function AthleteProgressPage() {
  const [oneRMData, setOneRMData] = useState<Record<string, ExerciseOneRM>>({})
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([])
  const [adherenceData, setAdherenceData] = useState<AdherenceDataPoint[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'all' | '3m' | '6m' | '1y'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchProgressData()
  }, [timeRange])

  async function fetchProgressData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch 1RM data (within the selected period)
      let oneRMQuery = supabase
        .from('estimated_1rm')
        .select('estimated_1rm, calculated_at, exercise_id, exercises(name, category)')
        .eq('athlete_id', user.id)
        .order('calculated_at', { ascending: true })
      if (timeRange !== 'all') {
        const since = new Date()
        since.setMonth(since.getMonth() - (timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12))
        oneRMQuery = oneRMQuery.gte('calculated_at', since.toISOString())
      }
      const { data: oneRM } = await oneRMQuery

      if (oneRM) {
        const grouped = oneRM.reduce<Record<string, ExerciseOneRM>>((acc, item: any) => {
          const key = item.exercise_id
          if (!acc[key]) {
            acc[key] = {
              exercise_id: item.exercise_id,
              exercise_name: item.exercises?.name,
              category: item.exercises?.category,
              dataPoints: [],
            }
          }
          // One point per day (the best set), not one per set
          const day = String(item.calculated_at).slice(0, 10)
          const value = Number(item.estimated_1rm)
          const existing = acc[key].dataPoints.find(p => p.date.slice(0, 10) === day)
          if (existing) {
            existing.estimated_1rm = Math.max(existing.estimated_1rm, value)
          } else {
            acc[key].dataPoints.push({
              date: item.calculated_at,
              estimated_1rm: value,
              exercise_name: item.exercises?.name,
              category: item.exercises?.category,
            })
          }
          return acc
        }, {})

        setOneRMData(grouped)
        
        const exerciseList = Object.values(grouped).map(g => ({
          id: g.exercise_id,
          name: g.exercise_name,
          category: g.category,
        }))
        setExercises(exerciseList)

        if (!selectedExercise && exerciseList.length > 0) {
          setSelectedExercise(exerciseList[0].id)
        }
      }

      // Fetch volume data
      const { data: volume } = await supabase
        .from('sets_log')
        .select('week, weight_kg, reps')
        .eq('athlete_id', user.id)
        .order('week', { ascending: true })

      if (volume) {
        const weekly = volume.reduce((acc: any, set) => {
          acc[set.week] = (acc[set.week] || 0) + set.weight_kg * set.reps
          return acc
        }, {})
        setVolumeData(Object.entries(weekly).map(([week, vol]) => ({ week: Number(week), volume: vol as number })))
      }

      // Fetch adherence data (last 90 days)
      const { data: sets } = await supabase
        .from('sets_log')
        .select('completed_at')
        .eq('athlete_id', user.id)
        .gte('completed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

      if (sets) {
        const completedDates = new Set(sets.map(s => s.completed_at.split('T')[0]))
        const heatmap = []
        for (let i = 89; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          heatmap.push({ date: dateStr, completed: completedDates.has(dateStr) })
        }
        setAdherenceData(heatmap)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOneRM = selectedExercise ? oneRMData[selectedExercise]?.dataPoints || [] : []

  const formatDate = (dateStr: string) => format(parseISO(dateStr), 'dd/MM', { locale: es })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Progreso</h1>
          <p className="text-gray-500 mt-1">Estadísticas y evolución de tus entrenamientos</p>
        </div>
        <div className="flex gap-4">
          <Select
            value={timeRange}
            onValueChange={(v) => v && setTimeRange(v as 'all' | '3m' | '6m' | '1y')}
            items={{ all: 'Todo el historial', '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '1y': 'Último año' }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el historial</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="1y">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedExercise || null}
            onValueChange={(v) => v && setSelectedExercise(v)}
            disabled={exercises.length === 0}
            items={Object.fromEntries(exercises.map(ex => [ex.id, ex.name]))}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Selecciona ejercicio" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map(ex => (
                <SelectItem key={ex.id} value={ex.id}>
                  {ex.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 1RM Progression */}
      <Card>
        <CardHeader>
          <CardTitle>1RM Estimado</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOneRM.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredOneRM.map(d => ({ ...d, date: formatDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={val => `${val} kg`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)} kg`, '1RM Estimado']}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="estimated_1rm"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Todavía no hay 1RM estimado. Se calcula al registrar sentadilla, banca o peso muerto.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume & Adherence */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Volumen Semanal (kg)</CardTitle>
          </CardHeader>
          <CardContent>
            {volumeData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={val => `${val} kg`} />
                    <YAxis dataKey="week" type="category" tick={{ fontSize: 12 }} label={{ value: 'Semana', position: 'insideLeft', offset: -10 }} />
                    <Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volumen']} />
                    <Bar dataKey="volume" fill="#10b981" radius={[0, 4, 4, 0]}>
                      {volumeData.map((_, i) => <Cell key={`cell-${i}`} fill={i === volumeData.length - 1 ? '#059669' : '#10b981'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No hay datos de volumen aún</div>
            )}
          </CardContent>
        </Card>

        {/* Adherence Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Adherencia (90 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {adherenceData.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max" style={{ minWidth: '90 * 28px' }}>
                  {adherenceData.map((day, i) => (
                    <div
                      key={day.date}
                      className="w-6 h-6 rounded-sm transition-colors"
                      style={{
                        backgroundColor: day.completed ? '#10b981' : '#e5e7eb',
                      }}
                      title={`${format(parseISO(day.date), 'dd MMM', { locale: es })}: ${day.completed ? 'Entrenó' : 'Descanso'}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{format(parseISO(adherenceData[0].date), 'dd MMM', { locale: es })}</span>
                  <span>{format(parseISO(adherenceData[adherenceData.length - 1].date), 'dd MMM', { locale: es })}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-green-500" />
                    <span>Entrenó</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-gray-200" />
                    <span>Descanso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Total: {adherenceData.filter(d => d.completed).length} / 90 días</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No hay datos de adherencia</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
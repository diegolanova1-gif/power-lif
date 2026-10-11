'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
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

interface BestWeightPoint {
  date: string
  weight_kg: number
}

export default function AthleteProgressPage() {
  const [oneRMData, setOneRMData] = useState<Record<string, ExerciseOneRM>>({})
  const [bestWeightData, setBestWeightData] = useState<Record<string, BestWeightPoint[]>>({})
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
      }

      // Mejor peso por sesión de CUALQUIER ejercicio registrado (accesorios incluidos,
      // que no tienen 1RM estimado porque no son sentadilla/banca/peso muerto)
      let bestWeightQuery = supabase
        .from('sets_log')
        .select('exercise_id, weight_kg, reps, completed_at, exercises!sets_log_exercise_id_fkey(name, category)')
        .eq('athlete_id', user.id)
        .gt('weight_kg', 0)
        .gt('reps', 0)
        .order('completed_at', { ascending: true })
      if (timeRange !== 'all') {
        const since = new Date()
        since.setMonth(since.getMonth() - (timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12))
        bestWeightQuery = bestWeightQuery.gte('completed_at', since.toISOString())
      }
      const { data: weightSets } = await bestWeightQuery

      const exerciseById = new Map<string, Exercise>()
      const bestWeight: Record<string, BestWeightPoint[]> = {}
      for (const s of weightSets ?? []) {
        const info = s.exercises as unknown as { name: string; category: string } | null
        if (!exerciseById.has(s.exercise_id)) exerciseById.set(s.exercise_id, { id: s.exercise_id, name: info?.name ?? 'Ejercicio', category: info?.category ?? '' })

        const day = String(s.completed_at).slice(0, 10)
        const value = Number(s.weight_kg)
        const points = (bestWeight[s.exercise_id] ??= [])
        const existing = points.find(p => p.date.slice(0, 10) === day)
        if (existing) existing.weight_kg = Math.max(existing.weight_kg, value)
        else points.push({ date: s.completed_at, weight_kg: value })
      }
      setBestWeightData(bestWeight)

      // Un ejercicio por selector: con 1RM (competencia) o solo mejor peso (accesorios)
      const exerciseList = [...exerciseById.values()].sort((a, b) => a.name.localeCompare(b.name))
      setExercises(exerciseList)
      if (!selectedExercise && exerciseList.length > 0) {
        setSelectedExercise(exerciseList[0].id)
      }

      // Fetch volume data — scoped to the current routine, since `week` is only
      // unique within one athlete_routine (an older program's "week 1" would
      // otherwise collide with the current program's "week 1" in the chart).
      const { data: currentRoutine } = await supabase
        .from('athlete_routines')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const volume = currentRoutine
        ? (
            await supabase
              .from('sets_log')
              .select('week, weight_kg, reps')
              .eq('athlete_id', user.id)
              .eq('athlete_routine_id', currentRoutine.id)
              .order('week', { ascending: true })
          ).data
        : []

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
  const filteredBestWeight = selectedExercise ? bestWeightData[selectedExercise] || [] : []
  const showingOneRM = filteredOneRM.length > 0

  const formatDate = (dateStr: string) => format(parseISO(dateStr), 'dd/MM', { locale: es })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const series = showingOneRM
    ? filteredOneRM.map(d => ({ date: d.date, value: d.estimated_1rm }))
    : filteredBestWeight.map(d => ({ date: d.date, value: d.weight_kg }))
  const latest = series.length > 0 ? series[series.length - 1].value : null
  const delta = series.length > 1 && latest !== null ? latest - series[0].value : null
  const chartData = series.map(d => ({ ...d, label: formatDate(d.date) }))
  const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

  const volumeSorted = [...volumeData].sort((a, b) => a.week - b.week)
  const lastVol = volumeSorted.at(-1)
  const prevVol = volumeSorted.at(-2)
  const volDelta = lastVol && prevVol && prevVol.volume > 0
    ? Math.round(((lastVol.volume - prevVol.volume) / prevVol.volume) * 100)
    : null
  const trainedDays = adherenceData.filter(d => d.completed).length

  const ranges: { id: 'all' | '3m' | '6m' | '1y'; label: string }[] = [
    { id: '3m', label: '3 meses' },
    { id: '6m', label: '6 meses' },
    { id: '1y', label: '1 año' },
    { id: 'all', label: 'Todo' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Progreso</h1>
        <Select
          value={selectedExercise || null}
          onValueChange={(v) => v && setSelectedExercise(v)}
          disabled={exercises.length === 0}
          items={Object.fromEntries(exercises.map(ex => [ex.id, ex.name]))}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Elegí un ejercicio" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map(ex => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="inline-flex w-fit rounded-lg bg-muted p-1">
          {ranges.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setTimeRange(r.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                timeRange === r.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="text-sm font-medium text-muted-foreground">
          {showingOneRM ? '1RM estimado' : 'Mejor peso por sesión'}
        </p>
        {latest !== null ? (
          <>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-foreground">
                {fmtKg(latest)}
                <span className="ml-1 text-xl text-muted-foreground">kg</span>
              </p>
              {delta !== null && (
                <span className={cn('font-mono text-lg font-medium tabular-nums', delta > 0 ? 'text-success' : 'text-muted-foreground')}>
                  {delta > 0 ? '+' : ''}{fmtKg(Number(delta.toFixed(1)))} kg
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {delta !== null ? `desde el ${chartData[0].label}` : 'Primer registro'}
            </p>
            {series.length > 1 && (
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)} kg`, showingOneRM ? '1RM estimado' : 'Mejor peso']}
                      labelFormatter={(label) => `Fecha: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#progressFill)"
                      dot={false}
                      activeDot={{ r: 5, fill: 'var(--primary)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay registros con peso para este ejercicio.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium text-muted-foreground">Días entrenados</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">{trainedDays}</p>
          <p className="text-sm text-muted-foreground">de los últimos 90 días</p>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium text-muted-foreground">Volumen semanal</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {lastVol ? lastVol.volume.toLocaleString('es-AR') : '—'}
            {lastVol && <span className="ml-1 text-base text-muted-foreground">kg</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            {volDelta !== null ? `${volDelta > 0 ? '+' : ''}${volDelta}% vs semana anterior` : 'última semana registrada'}
          </p>
        </div>
      </section>

      {volumeSorted.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">Volumen por semana</h2>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeSorted.map(v => ({ ...v, label: `S${v.week}` }))} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString('es-AR')} kg`, 'Volumen']} cursor={{ fill: 'var(--muted)' }} />
                  <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                    {volumeSorted.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={i === volumeSorted.length - 1 ? 'var(--primary)' : 'var(--border)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {adherenceData.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">Constancia</h2>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex justify-center">
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                {adherenceData.map(day => (
                  <div
                    key={day.date}
                    className={cn('h-3 w-3 rounded-sm sm:h-3.5 sm:w-3.5', day.completed ? 'bg-primary' : 'bg-muted')}
                    title={`${format(parseISO(day.date), 'dd MMM', { locale: es })}: ${day.completed ? 'Entrenó' : 'Descanso'}`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
              <span>{format(parseISO(adherenceData[0].date), 'dd MMM', { locale: es })}</span>
              <span>{format(parseISO(adherenceData[adherenceData.length - 1].date), 'dd MMM', { locale: es })}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

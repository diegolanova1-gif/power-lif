'use client'

import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import type { ProgressData } from '@/lib/load-progress'

const ranges: { id: 'all' | '3m' | '6m' | '1y'; label: string }[] = [
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '1y', label: '1 año' },
  { id: 'all', label: 'Todo' },
]

function sinceDate(range: string): Date | null {
  if (range === 'all') return null
  const d = new Date()
  d.setMonth(d.getMonth() - (range === '3m' ? 3 : range === '6m' ? 6 : 12))
  return d
}

export function ProgressView({ data }: { data: ProgressData }) {
  const [selectedExercise, setSelectedExercise] = useState(data.exercises[0]?.exercise_id ?? '')
  const [timeRange, setTimeRange] = useState<'all' | '3m' | '6m' | '1y'>('all')

  const exerciseItems = useMemo(() =>
    Object.fromEntries(data.exercises.map(ex => [ex.exercise_id, ex.exercise_name])),
    [data.exercises]
  )

  const exercise = data.exercises.find(e => e.exercise_id === selectedExercise)

  const { series, showingOneRM } = useMemo(() => {
    if (!exercise) return { series: [] as { date: string; value: number }[], showingOneRM: false }
    const since = sinceDate(timeRange)
    const filterFn = since ? (d: { date: string }) => new Date(d.date) >= since : () => true

    const oneRM = exercise.oneRM.filter(filterFn)
    if (oneRM.length > 0) return { series: oneRM.map(d => ({ date: d.date, value: d.estimated_1rm })), showingOneRM: true }

    const best = exercise.bestWeight.filter(filterFn)
    return { series: best.map(d => ({ date: d.date, value: d.weight_kg })), showingOneRM: false }
  }, [exercise, timeRange])

  const formatDate = (dateStr: string) => format(parseISO(dateStr), 'dd/MM', { locale: es })
  const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

  const latest = series.length > 0 ? series[series.length - 1].value : null
  const delta = series.length > 1 && latest !== null ? latest - series[0].value : null
  const chartData = series.map(d => ({ ...d, label: formatDate(d.date) }))

  const volumeSorted = useMemo(() => [...data.volume].sort((a, b) => a.week - b.week), [data.volume])
  const lastVol = volumeSorted.at(-1)
  const prevVol = volumeSorted.at(-2)
  const volDelta = lastVol && prevVol && prevVol.volume > 0
    ? Math.round(((lastVol.volume - prevVol.volume) / prevVol.volume) * 100)
    : null

  const adherenceData = useMemo(() => {
    const completedDates = new Set(data.trainedDates)
    const heatmap = []
    for (let i = 89; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      heatmap.push({ date: dateStr, completed: completedDates.has(dateStr) })
    }
    return heatmap
  }, [data.trainedDates])

  const trainedDays = adherenceData.filter(d => d.completed).length

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Progreso</h1>
        <Select
          value={selectedExercise || undefined}
          onValueChange={v => v && setSelectedExercise(v)}
          disabled={data.exercises.length === 0}
          items={exerciseItems}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Elegí un ejercicio" />
          </SelectTrigger>
          <SelectContent>
            {data.exercises.map(ex => (
              <SelectItem key={ex.exercise_id} value={ex.exercise_id} label={ex.exercise_name}>
                {ex.exercise_name}
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

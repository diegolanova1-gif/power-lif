'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Trend } from '@/lib/calculations/progression'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface OneRMSeries {
  exercise_id: string
  exercise_name: string
  category: string
  dataPoints: { date: string; estimated_1rm: number }[]
}

interface ExerciseProgress {
  exercise_id: string
  exercise_name: string
  category: string
  dataPoints: { date: string; weight_kg: number }[]
  trend: Trend
  deltaPct: number | null
  recentBest: number | null
  olderBest: number | null
}

interface Stats {
  oneRM: OneRMSeries[]
  volume: { weekly: { week: number; volume: number }[]; totalVolume: number }
  adherence: { overall: number; weekly: { week: number; adherence: number }[]; streak: number; currentWeekDays: number; currentWeekRequired: number }
  exercises: ExerciseProgress[]
}

const TREND_META: Record<Trend, { icon: typeof TrendingUp; color: string; label: (pct: number | null) => string }> = {
  down: { icon: TrendingDown, color: 'text-destructive', label: pct => `${pct!.toFixed(0)}%` },
  up: { icon: TrendingUp, color: 'text-success', label: pct => `+${pct!.toFixed(0)}%` },
  flat: { icon: Minus, color: 'text-muted-foreground', label: () => 'estable' },
  insufficient: { icon: Minus, color: 'text-muted-foreground', label: () => '—' },
}

const LIFTS = [
  { category: 'squat', label: 'Sentadilla', color: '#3b82f6' },
  { category: 'bench', label: 'Banca', color: '#10b981' },
  { category: 'deadlift', label: 'Peso muerto', color: '#f59e0b' },
] as const

const RANGES = { all: 'Todo el historial', '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '1y': 'Último año' }
type Range = keyof typeof RANGES

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`)
  return body
}

export function AthleteAnalytics({
  athletes,
  initialAthleteId,
}: {
  athletes: { id: string; full_name: string | null }[]
  initialAthleteId: string
}) {
  const router = useRouter()
  const [athleteId, setAthleteId] = useState(initialAthleteId)
  const [range, setRange] = useState<Range>('all')
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedProgressExercise, setSelectedProgressExercise] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const q = `athlete_id=${athleteId}`

    Promise.all([
      fetchJson<{ data: OneRMSeries[] }>(`/api/stats/1rm?${q}&range=${range}`),
      fetchJson<Stats['volume']>(`/api/stats/volume?${q}&weeks=12`),
      fetchJson<Stats['adherence']>(`/api/stats/adherence?${q}&weeks=12`),
      fetchJson<{ data: ExerciseProgress[] }>(`/api/stats/exercises?${q}`),
    ])
      .then(([oneRM, volume, adherence, exercises]) => {
        if (!cancelled) {
          setStats({ oneRM: oneRM.data, volume, adherence, exercises: exercises.data })
          setSelectedProgressExercise(exercises.data[0]?.exercise_id ?? null)
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [athleteId, range])

  function selectAthlete(id: string | null) {
    if (!id) return
    setStats(null)
    setError(null)
    setAthleteId(id)
    router.replace(`/coach/analytics?athlete=${id}`, { scroll: false })
  }

  function selectRange(value: string | null) {
    if (!value) return
    setStats(null)
    setError(null)
    setRange(value as Range)
  }

  // Best e1RM per competition lift, and a merged series for the multi-line chart
  const best = Object.fromEntries(
    LIFTS.map(l => {
      const points = stats?.oneRM.filter(s => s.category === l.category).flatMap(s => s.dataPoints) ?? []
      return [l.category, points.length ? Math.max(...points.map(p => Number(p.estimated_1rm))) : null]
    })
  ) as Record<(typeof LIFTS)[number]['category'], number | null>
  const bestValues = Object.values(best).filter((v): v is number => v !== null)
  const total = bestValues.length === LIFTS.length ? bestValues.reduce((a, b) => a + b, 0) : null

  const byDate = new Map<string, Record<string, number | string>>()
  stats?.oneRM
    .filter(s => LIFTS.some(l => l.category === s.category))
    .forEach(s =>
      s.dataPoints.forEach(p => {
        const day = p.date.split('T')[0]
        const row = byDate.get(day) ?? { date: day }
        row[s.category] = Math.max(Number(row[s.category] ?? 0), Number(p.estimated_1rm))
        byDate.set(day, row)
      })
    )
  const oneRMChart = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))

  const volumeSorted = stats ? [...stats.volume.weekly].sort((a, b) => a.week - b.week) : []
  const RANGE_ORDER: { id: Range; label: string }[] = [
    { id: '3m', label: '3 meses' },
    { id: '6m', label: '6 meses' },
    { id: '1y', label: '1 año' },
    { id: 'all', label: 'Todo' },
  ]
  const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)' }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Select
          value={athleteId}
          onValueChange={selectAthlete}
          items={Object.fromEntries(athletes.map(a => [a.id, a.full_name || 'Sin nombre']))}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {athletes.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.full_name || 'Sin nombre'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="inline-flex w-fit rounded-lg bg-muted p-1">
          {RANGE_ORDER.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => selectRange(r.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                range === r.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-card px-6 py-12 text-center text-destructive ring-1 ring-foreground/10">{error}</div>
      ) : !stats ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <p className="text-sm font-medium text-muted-foreground">Total estimado</p>
            <p className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight text-foreground">
              {total !== null ? total.toFixed(1) : '—'}
              {total !== null && <span className="ml-1 text-xl font-normal text-muted-foreground">kg</span>}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {LIFTS.map(l => (
                <div key={l.category}>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">
                    {best[l.category] !== null ? `${best[l.category]!.toFixed(1)} kg` : '—'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-sm font-medium text-muted-foreground">Volumen</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {Math.round(stats.volume.totalVolume).toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-muted-foreground">kg · 12 semanas</p>
            </div>
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-sm font-medium text-muted-foreground">Adherencia</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">{stats.adherence.overall}%</p>
              <p className="text-xs text-muted-foreground">esta semana {stats.adherence.currentWeekDays}/{stats.adherence.currentWeekRequired}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-sm font-medium text-muted-foreground">Racha</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">{stats.adherence.streak}</p>
              <p className="text-xs text-muted-foreground">{stats.adherence.streak === 1 ? 'día' : 'días'} seguidos</p>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-medium text-muted-foreground">1RM por levantamiento</h2>
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              {oneRMChart.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={oneRMChart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} tickFormatter={d => format(parseISO(d), 'dd/MM', { locale: es })} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={val => `${val}`} domain={['auto', 'auto']} />
                      <Tooltip
                        formatter={(value, name) => [`${Number(value).toFixed(1)} kg`, LIFTS.find(l => l.category === name)?.label ?? name]}
                        labelFormatter={label => format(parseISO(String(label)), 'dd MMM yyyy', { locale: es })}
                      />
                      {LIFTS.map(l => (
                        <Line key={l.category} type="monotone" dataKey={l.category} stroke={l.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sin datos de 1RM. Se calcula cuando registra sentadilla, banca o peso muerto.
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-medium text-muted-foreground">Progresión por ejercicio</h2>
            {stats.exercises.length === 0 ? (
              <div className="rounded-2xl bg-card px-6 py-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
                Todavía no hay series con peso registradas
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-[minmax(0,280px)_1fr]">
                <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-2xl bg-card ring-1 ring-foreground/10">
                  {stats.exercises.map(ex => {
                    const meta = TREND_META[ex.trend]
                    const Icon = meta.icon
                    const selected = ex.exercise_id === selectedProgressExercise
                    const latest = ex.dataPoints.at(-1)?.weight_kg
                    return (
                      <button
                        key={ex.exercise_id}
                        type="button"
                        onClick={() => setSelectedProgressExercise(ex.exercise_id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm transition-colors',
                          selected ? 'bg-muted' : 'hover:bg-muted/50'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{ex.exercise_name}</span>
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">{latest !== undefined ? `${latest} kg` : '—'}</span>
                        </span>
                        <span className={cn('flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums', meta.color)}>
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label(ex.deltaPct)}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {(() => {
                  const selected = stats.exercises.find(ex => ex.exercise_id === selectedProgressExercise)
                  if (!selected) return null
                  return (
                    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                      <p className="mb-2 font-medium text-foreground">{selected.exercise_name}</p>
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selected.dataPoints.map(d => ({ ...d, date: format(parseISO(d.date), 'dd/MM', { locale: es }) }))} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                            <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
                            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
                            <Tooltip formatter={(value: number) => [`${value} kg`, selected.exercise_name]} labelFormatter={label => `Fecha: ${label}`} />
                            <Line
                              type="monotone"
                              dataKey="weight_kg"
                              stroke={selected.trend === 'down' ? 'var(--destructive)' : 'var(--primary)'}
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="px-1 text-sm font-medium text-muted-foreground">Volumen por semana</h2>
              <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                {volumeSorted.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volumeSorted} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={w => `S${w}`} />
                        <YAxis hide />
                        <Tooltip
                          formatter={value => [`${Math.round(Number(value)).toLocaleString('es-AR')} kg`, 'Volumen']}
                          labelFormatter={w => `Semana ${w}`}
                          cursor={{ fill: 'var(--muted)' }}
                        />
                        <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                          {volumeSorted.map((_, i) => (
                            <Cell key={`vol-${i}`} fill={i === volumeSorted.length - 1 ? 'var(--primary)' : 'var(--border)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">Sin series en las últimas 12 semanas</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="px-1 text-sm font-medium text-muted-foreground">Adherencia por semana</h2>
              <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                {stats.adherence.weekly.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.adherence.weekly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={w => `S${w}`} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip formatter={value => [`${value}%`, 'Adherencia']} labelFormatter={w => `Semana ${w}`} cursor={{ fill: 'var(--muted)' }} />
                        <Bar dataKey="adherence" radius={[6, 6, 0, 0]}>
                          {stats.adherence.weekly.map((_, i) => (
                            <Cell key={`adh-${i}`} fill={i === stats.adherence.weekly.length - 1 ? 'var(--primary)' : 'var(--border)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">Sin programa activo asignado</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

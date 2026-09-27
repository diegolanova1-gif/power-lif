'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Trophy, Dumbbell, CalendarCheck, Flame } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface OneRMSeries {
  exercise_id: string
  exercise_name: string
  category: string
  dataPoints: { date: string; estimated_1rm: number }[]
}

interface Stats {
  oneRM: OneRMSeries[]
  volume: { weekly: { week: number; volume: number }[]; totalVolume: number }
  adherence: { overall: number; weekly: { week: number; adherence: number }[]; streak: number }
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

  useEffect(() => {
    let cancelled = false
    const q = `athlete_id=${athleteId}`

    Promise.all([
      fetchJson<{ data: OneRMSeries[] }>(`/api/stats/1rm?${q}&range=${range}`),
      fetchJson<Stats['volume']>(`/api/stats/volume?${q}&weeks=12`),
      fetchJson<Stats['adherence']>(`/api/stats/adherence?${q}&weeks=12`),
    ])
      .then(([oneRM, volume, adherence]) => {
        if (!cancelled) setStats({ oneRM: oneRM.data, volume, adherence })
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

  const kpis = [
    { name: 'Total estimado', value: total !== null ? `${total.toFixed(1)} kg` : '—', icon: Trophy, color: 'text-orange-600 bg-orange-100' },
    { name: 'Volumen (12 sem)', value: stats ? `${Math.round(stats.volume.totalVolume).toLocaleString('es-ES')} kg` : '—', icon: Dumbbell, color: 'text-blue-600 bg-blue-100' },
    { name: 'Adherencia', value: stats ? `${stats.adherence.overall}%` : '—', icon: CalendarCheck, color: 'text-green-600 bg-green-100' },
    { name: 'Racha', value: stats ? `${stats.adherence.streak} sem` : '—', icon: Flame, color: 'text-purple-600 bg-purple-100' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Select
          value={athleteId}
          onValueChange={selectAthlete}
          items={Object.fromEntries(athletes.map(a => [a.id, a.full_name || 'Sin nombre']))}
        >
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {athletes.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.full_name || 'Sin nombre'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={selectRange} items={RANGES}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RANGES).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Card>
          <CardContent className="text-center py-12 text-red-600">{error}</CardContent>
        </Card>
      ) : !stats ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {kpis.map(kpi => (
              <Card key={kpi.name}>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className={`rounded-lg p-3 ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{kpi.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>1RM Estimado</CardTitle>
                <div className="flex gap-4 text-sm">
                  {LIFTS.map(l => (
                    <span key={l.category} className="text-gray-500">
                      {l.label}: <span className="font-semibold text-gray-900">{best[l.category] !== null ? `${best[l.category]!.toFixed(1)} kg` : '—'}</span>
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {oneRMChart.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={oneRMChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={d => format(parseISO(d), 'dd/MM', { locale: es })} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={val => `${val} kg`} domain={['auto', 'auto']} />
                      <Tooltip
                        formatter={(value, name) => [`${Number(value).toFixed(1)} kg`, LIFTS.find(l => l.category === name)?.label ?? name]}
                        labelFormatter={label => format(parseISO(String(label)), 'dd MMM yyyy', { locale: es })}
                      />
                      <Legend formatter={value => LIFTS.find(l => l.category === value)?.label ?? value} />
                      {LIFTS.map(l => (
                        <Line
                          key={l.category}
                          type="monotone"
                          dataKey={l.category}
                          stroke={l.color}
                          strokeWidth={2}
                          dot={{ r: 3, fill: l.color }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Sin datos de 1RM. Se calculan con series de competición registradas con RPE ≥ 7.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Volumen Semanal (kg)</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.volume.weekly.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...stats.volume.weekly].sort((a, b) => a.week - b.week)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} tickFormatter={w => `S${w}`} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={val => `${Math.round(val / 1000)}k`} />
                        <Tooltip
                          formatter={value => [`${Math.round(Number(value)).toLocaleString('es-ES')} kg`, 'Volumen']}
                          labelFormatter={w => `Semana ${w}`}
                        />
                        <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Sin series en las últimas 12 semanas</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Adherencia Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.adherence.weekly.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.adherence.weekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} tickFormatter={w => `S${w}`} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={val => `${val}%`} />
                        <Tooltip formatter={value => [`${value}%`, 'Adherencia']} labelFormatter={w => `Semana ${w}`} />
                        <Bar dataKey="adherence" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Sin programa activo asignado</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

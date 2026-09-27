'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Trophy } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface BestRow {
  athlete_id: string
  full_name: string | null
  exercise_id: string
  exercise_name: string
  category: string | null
  is_competition_lift: boolean
  best_e1rm: number
  max_weight: number
  last_logged: string
}

interface HistoryRow {
  athlete_id: string
  full_name: string | null
  logged_on: string
  best_e1rm: number
}

interface RankRow {
  athleteId: string
  name: string
  e1rm: number
  maxWeight: number | null
  lastLogged: string | null
}

const TOTAL = 'total'
const COMPETITION_ORDER = ['squat', 'bench', 'deadlift']
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280']
const MEDALS = ['🥇', '🥈', '🥉']

export function TeamLeaderboard({ teamId, currentUserId }: { teamId: string; currentUserId?: string }) {
  const [supabase] = useState(() => createClient())
  const [bests, setBests] = useState<BestRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>(TOTAL)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    supabase.rpc('team_exercise_bests', { p_team_id: teamId }).then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setBests((data ?? []).map((r: BestRow) => ({ ...r, best_e1rm: Number(r.best_e1rm), max_weight: Number(r.max_weight) })))
    })
    return () => {
      cancelled = true
    }
  }, [supabase, teamId])

  useEffect(() => {
    if (selected === TOTAL) return
    let cancelled = false
    supabase.rpc('team_e1rm_history', { p_team_id: teamId, p_exercise_id: selected }).then(({ data }) => {
      if (!cancelled) setHistory((data ?? []).map((r: HistoryRow) => ({ ...r, best_e1rm: Number(r.best_e1rm) })))
    })
    return () => {
      cancelled = true
    }
  }, [supabase, teamId, selected])

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">{error}</CardContent>
      </Card>
    )
  }
  if (!bests) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Competition lifts first (squat, bench, deadlift), then the rest alphabetically
  const exercises = [...new Map(bests.map(b => [b.exercise_id, b])).values()].sort((a, b) => {
    const ia = a.is_competition_lift ? COMPETITION_ORDER.indexOf(a.category ?? '') : 99
    const ib = b.is_competition_lift ? COMPETITION_ORDER.indexOf(b.category ?? '') : 99
    return ia - ib || a.exercise_name.localeCompare(b.exercise_name)
  })
  const competition = exercises.filter(e => e.is_competition_lift)

  const ranking: RankRow[] =
    selected === TOTAL
      ? totalRanking(bests)
      : bests
          .filter(b => b.exercise_id === selected)
          .map(b => ({ athleteId: b.athlete_id, name: b.full_name || 'Alumno', e1rm: b.best_e1rm, maxWeight: b.max_weight, lastLogged: b.last_logged }))
          .sort((a, b) => b.e1rm - a.e1rm)

  function selectExercise(id: string | null) {
    if (!id) return
    setSelected(id)
    setHistory(null)
    const top = bests!.filter(b => b.exercise_id === id).sort((a, b) => b.best_e1rm - a.best_e1rm)
    // Default comparison: me vs the leader (or top 2 for the coach)
    setCompareIds(
      [...new Set([currentUserId, ...top.map(t => t.athlete_id)].filter((x): x is string => !!x && top.some(t => t.athlete_id === x)))].slice(0, 2)
    )
  }

  const chartAthletes = ranking.filter(r => compareIds.includes(r.athleteId))
  const chartData = buildChartData(history ?? [], compareIds)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={selected === TOTAL ? 'default' : 'outline'} onClick={() => setSelected(TOTAL)}>
          Total
        </Button>
        {competition.map(e => (
          <Button key={e.exercise_id} size="sm" variant={selected === e.exercise_id ? 'default' : 'outline'} onClick={() => selectExercise(e.exercise_id)}>
            {e.exercise_name}
          </Button>
        ))}
        <Select
          value={exercises.some(e => e.exercise_id === selected && !e.is_competition_lift) ? selected : null}
          onValueChange={selectExercise}
          items={Object.fromEntries(exercises.map(e => [e.exercise_id, e.exercise_name]))}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Otro ejercicio..." />
          </SelectTrigger>
          <SelectContent>
            {exercises.filter(e => !e.is_competition_lift).map(e => (
              <SelectItem key={e.exercise_id} value={e.exercise_id}>{e.exercise_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />
            {selected === TOTAL ? 'Ranking por Total (S + B + PM)' : `Ranking: ${exercises.find(e => e.exercise_id === selected)?.exercise_name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              {selected === TOTAL ? 'Nadie completó todavía los tres levantamientos.' : 'Sin registros en este ejercicio.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead className="text-right">{selected === TOTAL ? 'Total estimado' : '1RM estimado'}</TableHead>
                  {selected !== TOTAL && <TableHead className="hidden text-right sm:table-cell">Serie más pesada</TableHead>}
                  {selected !== TOTAL && <TableHead className="hidden text-right md:table-cell">Último registro</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((r, i) => (
                  <TableRow key={r.athleteId} className={cn(r.athleteId === currentUserId && 'bg-primary/5 font-medium')}>
                    <TableCell>{MEDALS[i] ?? i + 1}</TableCell>
                    <TableCell>{r.name}{r.athleteId === currentUserId && ' (tú)'}</TableCell>
                    <TableCell className="text-right font-semibold">{r.e1rm.toFixed(1)} kg</TableCell>
                    {selected !== TOTAL && <TableCell className="hidden text-right sm:table-cell">{r.maxWeight} kg</TableCell>}
                    {selected !== TOTAL && (
                      <TableCell className="hidden text-right text-gray-500 md:table-cell">
                        {r.lastLogged ? format(parseISO(r.lastLogged), 'dd MMM', { locale: es }) : '—'}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-gray-500">1RM estimado con Epley ajustado por RPE, sobre la mejor serie registrada.</p>
        </CardContent>
      </Card>

      {selected !== TOTAL && ranking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparar progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ranking.map(r => (
                <Button
                  key={r.athleteId}
                  size="sm"
                  variant={compareIds.includes(r.athleteId) ? 'default' : 'outline'}
                  onClick={() =>
                    setCompareIds(prev => (prev.includes(r.athleteId) ? prev.filter(id => id !== r.athleteId) : [...prev, r.athleteId]))
                  }
                >
                  {r.name}{r.athleteId === currentUserId && ' (tú)'}
                </Button>
              ))}
            </div>
            {!history ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : chartAthletes.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Elige alumnos para comparar.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={d => format(parseISO(d), 'dd/MM', { locale: es })} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v} kg`} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(value, id) => [`${Number(value).toFixed(1)} kg`, ranking.find(r => r.athleteId === id)?.name ?? id]}
                      labelFormatter={d => format(parseISO(String(d)), 'dd MMM yyyy', { locale: es })}
                    />
                    <Legend formatter={id => ranking.find(r => r.athleteId === id)?.name ?? id} />
                    {chartAthletes.map(r => (
                      <Line
                        key={r.athleteId}
                        type="monotone"
                        dataKey={r.athleteId}
                        stroke={COLORS[ranking.indexOf(r) % COLORS.length]}
                        strokeWidth={r.athleteId === currentUserId ? 3 : 2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Sum of best e1RM in the three competition lifts; only athletes with all three
function totalRanking(bests: BestRow[]): RankRow[] {
  const byAthlete = new Map<string, { name: string; lifts: Map<string, number> }>()
  for (const b of bests.filter(x => x.is_competition_lift && COMPETITION_ORDER.includes(x.category ?? ''))) {
    const entry = byAthlete.get(b.athlete_id) ?? { name: b.full_name || 'Alumno', lifts: new Map() }
    entry.lifts.set(b.category!, Math.max(entry.lifts.get(b.category!) ?? 0, b.best_e1rm))
    byAthlete.set(b.athlete_id, entry)
  }
  return [...byAthlete.entries()]
    .filter(([, v]) => v.lifts.size === COMPETITION_ORDER.length)
    .map(([athleteId, v]) => ({
      athleteId,
      name: v.name,
      e1rm: [...v.lifts.values()].reduce((a, b) => a + b, 0),
      maxWeight: null,
      lastLogged: null,
    }))
    .sort((a, b) => b.e1rm - a.e1rm)
}

function buildChartData(history: HistoryRow[], athleteIds: string[]) {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const h of history.filter(x => athleteIds.includes(x.athlete_id))) {
    const row = byDate.get(h.logged_on) ?? { date: h.logged_on }
    row[h.athlete_id] = h.best_e1rm
    byDate.set(h.logged_on, row)
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

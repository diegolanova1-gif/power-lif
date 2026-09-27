import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RoutineComparePicker } from '@/components/coach/routine-compare-picker'
import { summarizeRoutine, type RoutineSummary } from '@/lib/calculations/routine'
import { formatReps, type RoutineStructure } from '@/lib/validations/routine'
import { weekdayName } from '@/lib/weekdays'
import { cn } from '@/lib/utils'

const PROGRESSION_LABELS: Record<string, string> = {
  linear: 'Lineal',
  undulating: 'Ondulante',
  block: 'Bloques',
  conjugate: 'Conjugado',
  custom: 'Personalizada',
}

interface Metric {
  label: string
  value: (s: RoutineSummary) => number | null
  format?: (v: number) => string
}

const METRICS: Metric[] = [
  { label: 'Semanas', value: s => s.weeks },
  { label: 'Días por semana', value: s => s.daysPerWeek },
  { label: 'Ejercicios distintos', value: s => s.exerciseCount },
  { label: 'Series por semana', value: s => s.weeklySets },
  { label: '· Sentadilla', value: s => s.setsByCategory.squat },
  { label: '· Banca', value: s => s.setsByCategory.bench },
  { label: '· Peso muerto', value: s => s.setsByCategory.deadlift },
  { label: '· Accesorios', value: s => s.setsByCategory.accessory + s.setsByCategory.olympic + s.setsByCategory.other },
  { label: 'Reps por semana', value: s => s.weeklyReps },
  { label: 'Tonelaje semanal (cargas en kg)', value: s => s.weeklyTonnageKg, format: v => `${v.toLocaleString('es-ES')} kg` },
  { label: 'Intensidad media (% RM)', value: s => s.avgPercentRM, format: v => `${v.toFixed(0)}%` },
  { label: 'RPE objetivo medio', value: s => s.avgRpeTarget, format: v => v.toFixed(1) },
]

export default async function CompareRoutinesPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: routines } = await supabase
    .from('routines')
    .select('id, name, structure')
    .eq('coach_id', user?.id ?? '')
    .order('name')

  const list = routines ?? []
  const a = list.find(r => r.id === params.a) ?? null
  const b = list.find(r => r.id === params.b) ?? null
  const selected = [a, b].filter((r): r is NonNullable<typeof r> => !!r)

  const exerciseIds = [
    ...new Set(selected.flatMap(r => (r.structure as RoutineStructure).schedule.flatMap(d => d.exercises.map(e => e.exercise_id)))),
  ]
  const { data: exercises } = exerciseIds.length
    ? await supabase.from('exercises').select('id, name, category').in('id', exerciseIds)
    : { data: [] }
  const nameById = new Map((exercises ?? []).map(e => [e.id, e.name as string]))
  const categoryById = new Map((exercises ?? []).map(e => [e.id, e.category as string | null]))

  const columns = [a, b].map(r =>
    r ? { routine: r, structure: r.structure as RoutineStructure, summary: summarizeRoutine(r.structure as RoutineStructure, categoryById) } : null
  )
  const dayNumbers = [...new Set(columns.flatMap(c => c?.structure.schedule.map(d => d.day) ?? []))].sort((x, y) => x - y)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coach/routines" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comparar Rutinas</h1>
          <p className="text-gray-500 mt-1">Volumen, intensidad y estructura lado a lado (por semana)</p>
        </div>
      </div>

      {list.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">Necesitas al menos 2 rutinas para comparar.</CardContent>
        </Card>
      ) : (
        <>
          <RoutineComparePicker routines={list.map(r => ({ id: r.id, name: r.name }))} a={a?.id ?? null} b={b?.id ?? null} />

          {columns[0] && columns[1] ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen semanal</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead />
                        <TableHead>{columns[0].routine.name}</TableHead>
                        <TableHead>{columns[1].routine.name}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-gray-500">Progresión</TableCell>
                        <TableCell>{PROGRESSION_LABELS[columns[0].summary.progression]}</TableCell>
                        <TableCell>{PROGRESSION_LABELS[columns[1].summary.progression]}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-gray-500">Semanas de descarga</TableCell>
                        <TableCell>{columns[0].summary.deloadWeeks.join(', ') || '—'}</TableCell>
                        <TableCell>{columns[1].summary.deloadWeeks.join(', ') || '—'}</TableCell>
                      </TableRow>
                      {METRICS.map(metric => {
                        const values = columns.map(c => metric.value(c!.summary))
                        const [va, vb] = values
                        const higher = va !== null && vb !== null && va !== vb ? (va > vb ? 0 : 1) : null
                        return (
                          <TableRow key={metric.label}>
                            <TableCell className="text-gray-500">{metric.label}</TableCell>
                            {values.map((v, i) => (
                              <TableCell key={i} className={cn(higher === i && 'font-semibold text-gray-900')}>
                                {v === null ? '—' : metric.format ? metric.format(v) : v}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <p className="mt-3 text-xs text-gray-500">En negrita, el valor más alto. Tonelaje solo cuenta ejercicios cargados en kg; intensidad solo los cargados en % RM.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ejercicios por día</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {dayNumbers.map(dayNum => (
                    <div key={dayNum}>
                      <p className="mb-2 text-sm font-semibold text-gray-700">{weekdayName(dayNum)}</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {columns.map((c, i) => {
                          const day = c!.structure.schedule.find(d => d.day === dayNum)
                          return (
                            <div key={i} className="rounded-lg border p-3">
                              {day ? (
                                <>
                                  <p className="mb-2 text-xs text-gray-500">{day.name}</p>
                                  <ul className="space-y-1 text-sm">
                                    {[...day.exercises].sort((x, y) => x.order - y.order).map((ex, j) => (
                                      <li key={j} className="flex justify-between gap-2">
                                        <span>{nameById.get(ex.exercise_id) ?? 'Ejercicio'}</span>
                                        <span className="shrink-0 text-gray-500">
                                          {ex.sets}×{formatReps(ex)}{ex.intensity ? ` · ${ex.intensity}` : ''}{ex.rpe_target ? ` · RPE ${ex.rpe_target}` : ''}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : (
                                <p className="text-sm text-gray-400">Descanso</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">Elige dos rutinas para compararlas.</CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

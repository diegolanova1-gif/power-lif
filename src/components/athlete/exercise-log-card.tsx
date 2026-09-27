'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, CheckCircle2, AlertTriangle, Loader2, Pencil, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface Prescription {
  exercise_id: string
  exercise_name: string
  sets: number
  reps: number
  reps_max?: number
  load_type?: 'kg' | 'percent'
  load_value?: number
  rpe_target?: number
  rest_seconds?: number
  note?: string
}

export interface LoggedSet {
  set_number: number
  reps: number
  weight_kg: number
  rpe: number | null
}

interface ExerciseLogCardProps {
  prescription: Prescription
  logged: LoggedSet[]
  /** Best estimated 1RM, to turn %RM into kg */
  e1rm: number | null
  /** Last weight this athlete used on this exercise */
  lastWeight: number | null
  session: { athleteId: string; athleteRoutineId: string; week: number; day: number }
  onSaved: (sets: LoggedSet[]) => void
  children?: React.ReactNode
}

interface Row {
  reps: string
  weight: string
  done: boolean
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step

// Accepts "62,5" and "62.5"; empty = bodyweight (0)
const parseKg = (text: string) => (text.trim() === '' ? 0 : Number(text.trim().replace(',', '.')))

export function ExerciseLogCard({ prescription: p, logged, e1rm, lastWeight, session, onSaved, children }: ExerciseLogCardProps) {
  const [supabase] = useState(() => createClient())
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [rpe, setRpe] = useState('')
  const [quickWeight, setQuickWeight] = useState('')
  const [saving, setSaving] = useState(false)

  // Weight the coach asked for, in kg
  const coachKg =
    p.load_type === 'kg' && p.load_value !== undefined
      ? p.load_value
      : p.load_type === 'percent' && p.load_value !== undefined && e1rm
        ? roundTo((e1rm * p.load_value) / 100, 2.5)
        : null
  const suggestedKg = coachKg ?? lastWeight
  const repsLabel = p.reps_max && p.reps_max > p.reps ? `${p.reps}-${p.reps_max}` : String(p.reps)

  const isDone = logged.length > 0
  const asPrescribed =
    isDone &&
    logged.length >= p.sets &&
    logged.every(s => s.reps >= p.reps && (coachKg === null || s.weight_kg >= coachKg))

  function openEditor() {
    const base = isDone
      ? logged.map(s => ({ reps: String(s.reps), weight: String(s.weight_kg), done: true }))
      : Array.from({ length: p.sets }, () => ({
          reps: String(p.reps),
          weight: suggestedKg !== null ? String(suggestedKg) : '',
          done: true,
        }))
    setRows(base)
    setRpe(String(logged[0]?.rpe ?? p.rpe_target ?? ''))
    setEditing(true)
  }

  async function persist(sets: LoggedSet[]) {
    setSaving(true)
    try {
      const key = {
        athlete_routine_id: session.athleteRoutineId,
        exercise_id: p.exercise_id,
        week: session.week,
        day: session.day,
      }
      if (sets.length) {
        const { error } = await supabase.from('sets_log').upsert(
          sets.map(s => ({ ...key, athlete_id: session.athleteId, ...s })),
          { onConflict: 'athlete_routine_id,exercise_id,week,day,set_number' }
        )
        if (error) throw error
      }
      // Drop sets beyond the new count (e.g. did 3 of 4)
      const { error: deleteError } = await supabase
        .from('sets_log')
        .delete()
        .match(key)
        .gt('set_number', sets.length)
      if (deleteError) throw deleteError

      onSaved(sets)
      return true
    } catch (error) {
      console.error('Error saving sets:', error)
      toast.error(`No se pudo guardar: ${(error as Error).message}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function markDoneAsPrescribed() {
    const weight = coachKg ?? (quickWeight.trim() === '' ? suggestedKg ?? 0 : parseKg(quickWeight))
    if (Number.isNaN(weight) || weight < 0) {
      toast.error('Peso no válido')
      return
    }
    const ok = await persist(
      Array.from({ length: p.sets }, (_, i) => ({
        set_number: i + 1,
        reps: p.reps, // lower bound of a range: honest default, athlete can edit up
        weight_kg: weight,
        rpe: p.rpe_target ?? null,
      }))
    )
    if (ok) toast.success(`${p.exercise_name}: hecho 💪`)
  }

  async function saveEdited() {
    const done = rows.filter(r => r.done)
    const invalid = done.find(r => !/^\d+$/.test(r.reps.trim()) || Number(r.reps) < 1 || Number.isNaN(parseKg(r.weight)))
    if (invalid) {
      toast.error('Revisa las reps y el peso de cada serie')
      return
    }
    const effort = rpe.trim() === '' ? null : Number(rpe.trim().replace(',', '.'))
    if (effort !== null && (Number.isNaN(effort) || effort < 1 || effort > 10)) {
      toast.error('El esfuerzo va de 1 a 10')
      return
    }
    const ok = await persist(
      done.map((r, i) => ({
        set_number: i + 1,
        reps: Number(r.reps),
        weight_kg: parseKg(r.weight),
        rpe: effort,
      }))
    )
    if (ok) {
      setEditing(false)
      toast.success(done.length ? 'Guardado' : 'Series borradas')
    }
  }

  async function undo() {
    if (await persist([])) toast.success('Deshecho')
  }

  const updateRow = (i: number, patch: Partial<Row>) => setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <Card className={cn('transition-colors', asPrescribed && 'border-green-300 bg-green-50/40', isDone && !asPrescribed && 'border-amber-300 bg-amber-50/40')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg">{p.exercise_name}</CardTitle>
          {asPrescribed ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Hecho
            </span>
          ) : isDone ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Parcial
            </span>
          ) : null}
        </div>
        {/* What the coach asked for */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
          <span><span className="font-semibold">{p.sets}</span> series</span>
          <span><span className="font-semibold">{repsLabel}</span> reps</span>
          {p.load_type === 'kg' && p.load_value !== undefined && <span><span className="font-semibold">{p.load_value} kg</span></span>}
          {p.load_type === 'percent' && p.load_value !== undefined && (
            <span>
              <span className="font-semibold">{p.load_value}% RM</span>
              {coachKg !== null && <span className="text-gray-500"> ≈ {coachKg} kg</span>}
            </span>
          )}
          {p.rpe_target !== undefined && <span>Esfuerzo <span className="font-semibold">{p.rpe_target}/10</span></span>}
          {p.rest_seconds !== undefined && <span>Descanso <span className="font-semibold">{p.rest_seconds >= 60 ? `${Math.floor(p.rest_seconds / 60)}:${String(p.rest_seconds % 60).padStart(2, '0')} min` : `${p.rest_seconds} s`}</span></span>}
        </div>
        {p.note && <p className="mt-2 rounded-md bg-blue-50 px-2 py-1.5 text-sm text-blue-800">{p.note}</p>}
      </CardHeader>

      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Anota lo que hiciste en cada serie</p>
            {rows.map((row, i) => (
              <div key={i} className={cn('flex items-end gap-2 rounded-lg border bg-white p-2', !row.done && 'opacity-50')}>
                <button
                  type="button"
                  onClick={() => updateRow(i, { done: !row.done })}
                  aria-label={row.done ? `Marcar serie ${i + 1} como no hecha` : `Marcar serie ${i + 1} como hecha`}
                  className={cn(
                    'mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                    row.done ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 text-transparent'
                  )}
                >
                  <Check className="h-5 w-5" />
                </button>
                <div className="w-14 shrink-0 pb-2 text-sm font-medium text-gray-600">Serie {i + 1}</div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-500">Reps</Label>
                  <Input inputMode="numeric" value={row.reps} onChange={e => updateRow(i, { reps: e.target.value })} disabled={!row.done} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-500">Peso (kg)</Label>
                  <Input inputMode="decimal" placeholder="0" value={row.weight} onChange={e => updateRow(i, { weight: e.target.value })} disabled={!row.done} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-gray-400" onClick={() => setRows(prev => prev.filter((_, j) => j !== i))} aria-label={`Quitar serie ${i + 1}`}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows(prev => [...prev, { ...(prev.at(-1) ?? { reps: String(p.reps), weight: '' }), done: true }])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar serie
              </Button>
              <div className="w-40 space-y-1">
                <Label className="text-xs text-gray-500">Esfuerzo (1-10, opcional)</Label>
                <Input inputMode="decimal" placeholder="ej: 8" value={rpe} onChange={e => setRpe(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={saveEdited} disabled={saving} className="flex-1 sm:flex-none">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Guardar lo que hice
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : isDone ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {logged.map(s => (
                <span key={s.set_number} className="rounded-md border bg-white px-2 py-1 text-sm">
                  <span className="text-gray-500">S{s.set_number}:</span> {s.reps} × {s.weight_kg > 0 ? `${s.weight_kg} kg` : 'peso corporal'}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openEditor} disabled={saving}>
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-gray-500" onClick={undo} disabled={saving}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Deshacer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {coachKg === null && (
              <div className="max-w-xs space-y-1">
                <Label className="text-xs text-gray-500">¿Con cuánto peso? (kg)</Label>
                <Input
                  inputMode="decimal"
                  placeholder={lastWeight !== null ? `Última vez: ${lastWeight}` : 'Vacío = peso corporal'}
                  value={quickWeight}
                  onChange={e => setQuickWeight(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" size="lg" className="h-12 bg-green-600 text-base hover:bg-green-700" onClick={markDoneAsPrescribed} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                Hecho tal cual
              </Button>
              <Button type="button" size="lg" variant="outline" className="h-12" onClick={openEditor} disabled={saving}>
                <Pencil className="mr-2 h-4 w-4" />
                No pude completarlo / cambié algo
              </Button>
            </div>
          </div>
        )}

        {children}
      </CardContent>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, CheckCircle2, Loader2, Pencil, Plus, Repeat, RotateCcw, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { createExercise } from '@/actions/exercises'
import { formatDuration } from '@/lib/validations/routine'
import { cn } from '@/lib/utils'

export interface Prescription {
  exercise_id: string
  exercise_name: string
  sets: number
  /** Ejercicios de tiempo (plancha, cardio...) traen duration_seconds en vez de reps */
  reps?: number
  reps_max?: number
  duration_seconds?: number
  load_type?: 'kg' | 'percent'
  load_value?: number
  rpe_target?: number
  rest_seconds?: number
  note?: string
  video_url?: string | null
}

export interface LoggedSet {
  set_number: number
  reps: number | null
  duration_seconds?: number | null
  weight_kg: number
  rpe: number | null
  /** Si hizo otro ejercicio en vez del pautado (misma cantidad de series/reps pedida, solo cambia cuál) */
  substitutedExerciseId?: string | null
  substitutedExerciseName?: string | null
}

interface ExerciseLogCardProps {
  prescription: Prescription
  logged: LoggedSet[]
  /** Best estimated 1RM, to turn %RM into kg */
  e1rm: number | null
  /** Last weight this athlete used on this exercise */
  lastWeight: number | null
  /** Last reps this athlete did on this exercise */
  lastReps?: number | null
  session: { athleteId: string; athleteRoutineId: string; week: number; day: number }
  /** Set when this card is logging a "día extra" session rather than the
   * athlete's actual current day — tags the rows so the streak/order rules
   * treat them differently. Undefined = normal session (the common case). */
  extraType?: 'advance_credit' | 'advance_no_credit'
  onSaved: (sets: LoggedSet[]) => void
  /** Collapsible mode (Registrar list). Omitted = always open (día extra dialog). */
  expanded?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}

interface Row {
  reps: string
  duration: string
  weight: string
  done: boolean
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step

// Accepts "62,5" and "62.5"; empty = bodyweight (0)
const parseKg = (text: string) => (text.trim() === '' ? 0 : Number(text.trim().replace(',', '.')))

export function ExerciseLogCard({ prescription: p, logged, e1rm, lastWeight, lastReps = null, session, extraType, onSaved, expanded = true, onToggle, children }: ExerciseLogCardProps) {
  const [supabase] = useState(() => createClient())
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [rpe, setRpe] = useState('')
  const [saving, setSaving] = useState(false)
  const [substituting, setSubstituting] = useState(false)
  const [substituteName, setSubstituteName] = useState('')

  // Weight the coach asked for, in kg
  const coachKg =
    p.load_type === 'kg' && p.load_value !== undefined
      ? p.load_value
      : p.load_type === 'percent' && p.load_value !== undefined && e1rm
        ? roundTo((e1rm * p.load_value) / 100, 2.5)
        : null
  const suggestedKg = coachKg ?? lastWeight
  const isTimed = p.duration_seconds !== undefined
  const repsLabel = p.reps !== undefined && p.reps_max && p.reps_max > p.reps ? `${p.reps}-${p.reps_max}` : String(p.reps ?? '')

  const isDone = logged.length > 0
  // Todas las series cargadas = hecho, aunque alguna haya quedado corta de
  // reps/peso — eso se marca aparte al coach (ver flagRepsShortfall), no se
  // le muestra al alumno como "no lo hiciste".


  function openEditor() {
    const base = isDone
      ? logged.map(s => ({ reps: s.reps !== null ? String(s.reps) : '', duration: s.duration_seconds ? String(s.duration_seconds) : '', weight: String(s.weight_kg), done: true }))
      : Array.from({ length: p.sets }, () => ({
          reps: p.reps !== undefined ? String(p.reps) : '',
          duration: p.duration_seconds !== undefined ? String(p.duration_seconds) : '',
          weight: suggestedKg !== null ? String(suggestedKg) : '',
          done: true,
        }))
    setRows(base)
    setRpe(String(logged[0]?.rpe ?? p.rpe_target ?? ''))
    setSubstituting(!!logged[0]?.substitutedExerciseId)
    setSubstituteName(logged[0]?.substitutedExerciseName ?? '')
    setEditing(true)
  }

  // Mismo patrón que "ejercicio aparte" del día extra: busca por nombre en lo
  // que el alumno puede ver (catálogo + lo propio) y si no existe lo crea.
  async function resolveSubstituteId(name: string): Promise<string | null> {
    const trimmed = name.trim()
    const created = await createExercise({ name: trimmed, category: 'other' })
    if (created.success && created.exercise) return created.exercise.id
    const { data } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', trimmed.replace(/[%_\\]/g, '\\$&'))
      .limit(1)
      .maybeSingle()
    return data?.id ?? null
  }

  // Hizo todas las series pero se quedó corto de reps/duración/peso: le avisa
  // solo al coach (bandeja de Revisiones), sin pisar una observación que el
  // alumno ya haya dejado a mano.
  async function flagRepsShortfall(sets: LoggedSet[], key: { athlete_routine_id: string; exercise_id: string; week: number; day: number }) {
    if (sets.length < p.sets) return
    const met = isTimed
      ? sets.every(s => (s.duration_seconds ?? 0) >= (p.duration_seconds ?? 0) && (coachKg === null || s.weight_kg >= coachKg))
      : sets.every(s => (s.reps ?? 0) >= (p.reps ?? 0) && (coachKg === null || s.weight_kg >= coachKg))
    if (met) return
    const { data: existing } = await supabase.from('exercise_feedback').select('id').match(key).maybeSingle()
    if (existing) return
    await supabase.from('exercise_feedback').insert({
      athlete_id: session.athleteId,
      ...key,
      reason: 'reps_incomplete',
      note: 'Completó todas las series pero no llegó a las repeticiones/peso pedidos.',
      reviewed_at: null,
    })
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
          sets.map(s => ({
            ...key,
            athlete_id: session.athleteId,
            extra_type: extraType ?? null,
            set_number: s.set_number,
            reps: s.reps,
            duration_seconds: s.duration_seconds ?? null,
            weight_kg: s.weight_kg,
            rpe: s.rpe,
            substituted_exercise_id: s.substitutedExerciseId ?? null,
          })),
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

      if (sets.length) await flagRepsShortfall(sets, key).catch(err => console.error('Error flagging reps shortfall:', err))

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

  async function saveEdited() {
    const done = rows.filter(r => r.done)
    const invalid = isTimed
      ? done.find(r => !/^\d+$/.test(r.duration.trim()) || Number(r.duration) < 1 || Number.isNaN(parseKg(r.weight)))
      : done.find(r => !/^\d+$/.test(r.reps.trim()) || Number(r.reps) < 1 || Number.isNaN(parseKg(r.weight)))
    if (invalid) {
      toast.error(isTimed ? 'Revisa la duración y el peso de cada serie' : 'Revisa las reps y el peso de cada serie')
      return
    }
    const effort = rpe.trim() === '' ? null : Number(rpe.trim().replace(',', '.'))
    if (effort !== null && (Number.isNaN(effort) || effort < 1 || effort > 10)) {
      toast.error('El esfuerzo va de 1 a 10')
      return
    }
    if (substituting && substituteName.trim().length < 2) {
      toast.error('Poné el nombre del ejercicio que hiciste en su lugar')
      return
    }

    let substitutedExerciseId: string | null = null
    let substitutedExerciseName: string | null = null
    if (substituting && done.length) {
      const trimmed = substituteName.trim()
      const id = await resolveSubstituteId(trimmed)
      if (!id) {
        toast.error('No se pudo guardar el ejercicio de reemplazo')
        return
      }
      substitutedExerciseId = id
      substitutedExerciseName = trimmed
    }

    const ok = await persist(
      done.map((r, i) => ({
        set_number: i + 1,
        reps: isTimed ? null : Number(r.reps),
        duration_seconds: isTimed ? Number(r.duration) : null,
        weight_kg: parseKg(r.weight),
        rpe: effort,
        substitutedExerciseId,
        substitutedExerciseName,
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
    <div
      className={cn(
        'rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition-all',
        expanded && onToggle && 'shadow-md ring-primary/30',
        isDone && 'ring-success/40'
      )}
    >
      <div
        className={cn(expanded && 'pb-3', onToggle && 'cursor-pointer')}
        role={onToggle ? 'button' : undefined}
        tabIndex={onToggle ? 0 : undefined}
        aria-expanded={onToggle ? expanded : undefined}
        onClick={onToggle}
        onKeyDown={onToggle ? e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle()) : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {onToggle && (
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                  isDone ? 'border-success bg-success text-success-foreground' : 'border-border text-transparent'
                )}
              >
                <Check className="h-4 w-4" />
              </span>
            )}
            <h3 className="truncate text-base font-semibold text-foreground">{p.exercise_name}</h3>
            {p.video_url && (
              <a
                href={p.video_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Video className="h-3.5 w-3.5" />
                Ver video
              </a>
            )}
          </div>
          {onToggle ? null : isDone ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-success">
              <CheckCircle2 className="h-5 w-5" /> Hecho
            </span>
          ) : null}
        </div>
        {logged[0]?.substitutedExerciseName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Hiciste <span className="font-medium text-foreground">{logged[0].substitutedExerciseName}</span> en vez de {p.exercise_name}
          </p>
        )}
        {/* What the coach asked for */}
        <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
          {[
            `${p.sets} × ${isTimed ? formatDuration(p.duration_seconds!) : repsLabel}`,
            p.load_type === 'kg' && p.load_value !== undefined ? `${p.load_value} kg` : null,
            p.load_type === 'percent' && p.load_value !== undefined
              ? `${p.load_value}% RM${coachKg !== null ? ` ≈ ${coachKg} kg` : ''}`
              : null,
            p.rpe_target !== undefined ? `Esfuerzo ${p.rpe_target}/10` : null,
            p.rest_seconds !== undefined
              ? `desc. ${p.rest_seconds >= 60 ? `${Math.floor(p.rest_seconds / 60)}:${String(p.rest_seconds % 60).padStart(2, '0')}` : `${p.rest_seconds} s`}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {!expanded && !isDone && lastWeight !== null && (
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground/70">
            Último: {lastWeight > 0 ? `${lastWeight} kg` : 'peso corporal'}{lastReps !== null ? ` × ${lastReps} reps` : ''}
          </p>
        )}
        {expanded && p.note && <p className="mt-2 rounded-md bg-accent px-2 py-1.5 text-sm text-accent-foreground">{p.note}</p>}
      </div>

      {expanded && (
      <div className="space-y-3">
        {editing ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSubstituting(v => !v)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                substituting ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <span className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Hice otro ejercicio en vez de este
              </span>
              <span className="text-xs">{substituting ? 'Quitar' : 'Cambiar'}</span>
            </button>
            {substituting && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">¿Qué ejercicio hiciste en su lugar?</Label>
                <Input
                  value={substituteName}
                  onChange={e => setSubstituteName(e.target.value)}
                  placeholder="Ej: Prensa de piernas"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">Mismas series/reps pedidas, solo cambia el ejercicio. Si no existe en el catálogo, se crea.</p>
              </div>
            )}
            <p className="text-sm font-medium text-muted-foreground">Anota lo que hiciste en cada serie</p>
            {rows.map((row, i) => (
              <div key={i} className={cn('flex items-end gap-2 rounded-lg border bg-background p-2', !row.done && 'opacity-50')}>
                <button
                  type="button"
                  onClick={() => updateRow(i, { done: !row.done })}
                  aria-label={row.done ? `Marcar serie ${i + 1} como no hecha` : `Marcar serie ${i + 1} como hecha`}
                  className={cn(
                    'mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                    row.done ? 'border-success bg-success text-success-foreground' : 'border-border text-transparent'
                  )}
                >
                  <Check className="h-5 w-5" />
                </button>
                <div className="w-14 shrink-0 pb-2 text-sm font-medium text-muted-foreground">Serie {i + 1}</div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{isTimed ? 'Duración (seg)' : 'Reps'}</Label>
                  {isTimed ? (
                    <Input inputMode="numeric" value={row.duration} onChange={e => updateRow(i, { duration: e.target.value })} disabled={!row.done} />
                  ) : (
                    <Input inputMode="numeric" value={row.reps} onChange={e => updateRow(i, { reps: e.target.value })} disabled={!row.done} />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                  <Input inputMode="decimal" placeholder="0" value={row.weight} onChange={e => updateRow(i, { weight: e.target.value })} disabled={!row.done} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setRows(prev => prev.filter((_, j) => j !== i))} aria-label={`Quitar serie ${i + 1}`}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows(prev => [...prev, { ...(prev.at(-1) ?? { reps: String(p.reps ?? ''), duration: String(p.duration_seconds ?? ''), weight: '' }), done: true }])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar serie
              </Button>
              <div className="w-40 space-y-1">
                <Label className="text-xs text-muted-foreground">Esfuerzo (1-10, opcional)</Label>
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
                <span key={s.set_number} className="rounded-md border bg-background px-2 py-1 text-sm font-mono tabular-nums">
                  <span className="text-muted-foreground">S{s.set_number}:</span> {s.duration_seconds ? formatDuration(s.duration_seconds) : s.reps} × {s.weight_kg > 0 ? `${s.weight_kg} kg` : 'peso corporal'}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openEditor} disabled={saving}>
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={undo} disabled={saving}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Deshacer
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" size="lg" className="h-12 w-full text-base sm:w-auto" onClick={openEditor} disabled={saving}>
            <Pencil className="mr-2 h-4 w-4" />
            Registrar series / cambié algo
          </Button>
        )}

        {children}
      </div>
      )}
    </div>
  )
}

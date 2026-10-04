'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { createExercise } from '@/actions/exercises'

interface Row {
  reps: string
  weight: string
}

// "Ejercicio aparte" (opción 3 del día extra): no tiene prescripción de la
// rutina, así que el propio alumno define todo — incluye el nombre, que
// puede no existir todavía en el catálogo. Suma a la racha pero no toca el
// orden ni el avance de la rutina (extra_type='freeform' lo exime de ambos).
export function FreeformExerciseForm({
  athleteId,
  athleteRoutineId,
  week,
  day,
  onSaved,
}: {
  athleteId: string
  athleteRoutineId: string
  week: number
  day: number
  onSaved: () => void
}) {
  const [supabase] = useState(() => createClient())
  const [name, setName] = useState('')
  const [isTimed, setIsTimed] = useState(false)
  const [rows, setRows] = useState<Row[]>([{ reps: '', weight: '' }])
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [saving, setSaving] = useState(false)

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function resolveExerciseId(trimmedName: string): Promise<string | null> {
    const created = await createExercise({ name: trimmedName, category: 'other' })
    if (created.success && created.exercise) return created.exercise.id

    // Already exists (in what this athlete can see) — reuse it instead of failing.
    const { data } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', trimmedName.replace(/[%_\\]/g, '\\$&'))
      .limit(1)
      .maybeSingle()
    return data?.id ?? null
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      toast.error('Poné un nombre para el ejercicio')
      return
    }

    let durationSeconds: number | null = null
    if (isTimed) {
      durationSeconds = (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
      if (durationSeconds <= 0) {
        toast.error('Poné una duración válida')
        return
      }
    } else if (rows.every(r => r.reps.trim() === '')) {
      toast.error('Cargá al menos una serie con repeticiones')
      return
    }

    setSaving(true)
    try {
      const exerciseId = await resolveExerciseId(trimmedName)
      if (!exerciseId) {
        toast.error('No se pudo guardar el ejercicio')
        return
      }

      const base = {
        athlete_id: athleteId,
        athlete_routine_id: athleteRoutineId,
        exercise_id: exerciseId,
        week,
        day,
        extra_type: 'freeform' as const,
      }

      const payload = isTimed
        ? [{ ...base, set_number: 1, weight_kg: 0, reps: null, duration_seconds: durationSeconds }]
        : rows
            .filter(r => r.reps.trim() !== '')
            .map((r, i) => ({
              ...base,
              set_number: i + 1,
              weight_kg: r.weight.trim() === '' ? 0 : Number(r.weight.replace(',', '.')),
              reps: Number(r.reps),
              duration_seconds: null,
            }))

      const { error } = await supabase.from('sets_log').insert(payload)
      if (error) throw error

      toast.success(`"${trimmedName}" registrado`)
      onSaved()
    } catch (error) {
      toast.error(`No se pudo guardar: ${(error as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="freeform-name">¿Qué ejercicio hiciste?</Label>
        <Input id="freeform-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Remo con mancuerna" maxLength={100} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label htmlFor="freeform-timed" className="cursor-pointer">Se mide en tiempo (no en series)</Label>
        <Switch id="freeform-timed" checked={isTimed} onCheckedChange={setIsTimed} />
      </div>

      {isTimed ? (
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Minutos</Label>
            <Input type="number" min={0} value={minutes} onChange={e => setMinutes(e.target.value)} className="w-20" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Segundos</Label>
            <Input type="number" min={0} max={59} value={seconds} onChange={e => setSeconds(e.target.value)} className="w-20" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Serie {i + 1} · Reps</Label>
                <Input type="number" min={0} value={row.reps} onChange={e => updateRow(i, { reps: e.target.value })} className="w-24" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                <Input value={row.weight} onChange={e => updateRow(i, { weight: e.target.value })} placeholder="Vacío = corporal" className="w-32" />
              </div>
              {rows.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setRows(prev => [...prev, { reps: '', weight: '' }])}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar serie
          </Button>
        </div>
      )}

      <Button type="button" className="w-full" disabled={saving} onClick={handleSave}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Registrar ejercicio extra
      </Button>
    </div>
  )
}

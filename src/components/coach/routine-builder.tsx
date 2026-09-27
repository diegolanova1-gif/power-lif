'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRoutine, updateRoutine } from '@/actions/routines'
import { routineStructureSchema, type RoutineStructure } from '@/lib/validations/routine'
import { NewExerciseDialog } from '@/components/coach/new-exercise-dialog'

export interface ExerciseOption {
  id: string
  name: string
  category: string | null
  is_competition_lift: boolean | null
}

interface BuilderExercise {
  exercise_id: string
  sets: number
  reps: number
  load_type: LoadType
  load_value?: number
  rpe_target?: number
  rest_seconds?: number
}

type LoadType = 'kg' | 'percent'

interface BuilderDay {
  day: number
  name: string
  exercises: BuilderExercise[]
}

interface RoutineBuilderProps {
  exercises: ExerciseOption[]
  routine?: {
    id: string
    name: string
    description: string | null
    structure: RoutineStructure
  }
}

const PROGRESSIONS: Record<RoutineStructure['progression'], string> = {
  linear: 'Lineal',
  undulating: 'Ondulante (DUP)',
  block: 'Por bloques',
  conjugate: 'Conjugado',
  custom: 'Personalizada',
}

const CATEGORY_LABELS: Record<string, string> = {
  squat: 'Sentadilla',
  bench: 'Banca',
  deadlift: 'Peso muerto',
  accessory: 'Accesorio',
  olympic: 'Olímpico',
  other: 'Otro',
}

const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7]

const emptyExercise = (loadType: LoadType = 'kg'): BuilderExercise => ({ exercise_id: '', sets: 3, reps: 5, load_type: loadType })

const formatLoad = (type: LoadType, value: number) => (type === 'kg' ? `${value} kg` : `${value}% RM`)

// Older routines only stored free text ("75% 1RM", "100 kg")
function parseLoad(e: RoutineStructure['schedule'][number]['exercises'][number]): Pick<BuilderExercise, 'load_type' | 'load_value'> {
  if (e.load_type) return { load_type: e.load_type, load_value: e.load_value }
  const match = e.intensity?.match(/(\d+(?:[.,]\d+)?)\s*(%|kg)/i)
  if (!match) return { load_type: 'kg' }
  return {
    load_type: match[2] === '%' ? 'percent' : 'kg',
    load_value: Number(match[1].replace(',', '.')),
  }
}

const parseOptionalNumber = (value: string) => (value === '' ? undefined : Number(value))

export function RoutineBuilder({ exercises: initialExercises, routine }: RoutineBuilderProps) {
  const router = useRouter()
  const initial = routine?.structure

  const [name, setName] = useState(routine?.name ?? '')
  const [description, setDescription] = useState(routine?.description ?? '')
  const [weeks, setWeeks] = useState(initial?.weeks ?? 4)
  const [progression, setProgression] = useState<RoutineStructure['progression']>(initial?.progression ?? 'linear')
  const [deloadWeeks, setDeloadWeeks] = useState(initial?.deload_weeks?.join(', ') ?? '')
  const [schedule, setSchedule] = useState<BuilderDay[]>(
    initial?.schedule.map(d => ({
      day: d.day,
      name: d.name,
      exercises: [...d.exercises]
        .sort((a, b) => a.order - b.order)
        .map(e => ({
          exercise_id: e.exercise_id,
          sets: e.sets,
          reps: e.reps,
          ...parseLoad(e),
          rpe_target: e.rpe_target,
          rest_seconds: e.rest_seconds,
        })),
    })) ?? [{ day: 1, name: 'Día 1', exercises: [emptyExercise()] }]
  )
  const [saving, setSaving] = useState(false)
  const [exercises, setExercises] = useState(initialExercises)

  const exerciseItems = Object.fromEntries(exercises.map(e => [e.id, e.name]))
  const exercisesByCategory = exercises.reduce<Record<string, ExerciseOption[]>>((acc, e) => {
    const key = e.category ?? 'other'
    ;(acc[key] ??= []).push(e)
    return acc
  }, {})

  function updateDay(index: number, patch: Partial<BuilderDay>) {
    setSchedule(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function addDay() {
    const used = new Set(schedule.map(d => d.day))
    const next = DAY_NUMBERS.find(n => !used.has(n))
    if (!next) return
    setSchedule(prev => [...prev, { day: next, name: `Día ${next}`, exercises: [emptyExercise()] }])
  }

  function removeDay(index: number) {
    setSchedule(prev => prev.filter((_, i) => i !== index))
  }

  function updateExercise(dayIndex: number, exIndex: number, patch: Partial<BuilderExercise>) {
    setSchedule(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: d.exercises.map((e, j) => (j === exIndex ? { ...e, ...patch } : e)) }
          : d
      )
    )
  }

  function addExercise(dayIndex: number) {
    setSchedule(prev =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, exercises: [...d.exercises, emptyExercise(d.exercises.at(-1)?.load_type)] } : d
      )
    )
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setSchedule(prev =>
      prev.map((d, i) => (i === dayIndex ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) } : d))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (new Set(schedule.map(d => d.day)).size !== schedule.length) {
      toast.error('Hay días repetidos en la semana')
      return
    }
    if (schedule.some(d => d.exercises.some(ex => !ex.exercise_id))) {
      toast.error('Selecciona un ejercicio en cada fila')
      return
    }
    if (schedule.some(d => d.exercises.some(ex => ex.load_type === 'percent' && (ex.load_value ?? 0) > 110))) {
      toast.error('El % de RM no puede superar 110%')
      return
    }

    const deload = deloadWeeks
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)

    const structure = {
      name: name.trim(),
      weeks,
      progression,
      schedule: [...schedule]
        .sort((a, b) => a.day - b.day)
        .map(d => ({
          day: d.day,
          name: d.name.trim(),
          exercises: d.exercises.map((ex, order) => ({
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps,
            // intensity = readable text the athlete pages already display
            ...(ex.load_value !== undefined && {
              load_type: ex.load_type,
              load_value: ex.load_value,
              intensity: formatLoad(ex.load_type, ex.load_value),
            }),
            ...(ex.rpe_target !== undefined && { rpe_target: ex.rpe_target }),
            ...(ex.rest_seconds !== undefined && { rest_seconds: ex.rest_seconds }),
            order,
          })),
        })),
      ...(deload.length > 0 && { deload_weeks: deload }),
    }

    const validation = routineStructureSchema.safeParse(structure)
    if (!validation.success) {
      const issue = validation.error.issues[0]
      toast.error(`${issue.path.join(' › ')}: ${issue.message}`)
      return
    }
    if (deload.some(w => w > weeks)) {
      toast.error('Las semanas de descarga no pueden superar la duración del programa')
      return
    }

    const formData = new FormData()
    formData.set('name', structure.name)
    formData.set('description', description.trim())
    formData.set('structure', JSON.stringify(validation.data))

    setSaving(true)
    const result = routine ? await updateRoutine(routine.id, formData) : await createRoutine(formData)
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(routine ? 'Rutina actualizada' : 'Rutina creada')
    router.push('/coach/routines')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/coach/routines" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{routine ? 'Editar Rutina' : 'Nueva Rutina'}</h1>
            <p className="text-gray-500 mt-1">Define la estructura semanal y la progresión del programa</p>
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? 'Guardando...' : 'Guardar rutina'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Bloque de fuerza 4 semanas" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Progresión</Label>
            <Select
              value={progression}
              onValueChange={v => v && setProgression(v as RoutineStructure['progression'])}
              items={PROGRESSIONS}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROGRESSIONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeks">Semanas</Label>
            <Input id="weeks" type="number" min={1} max={52} value={weeks} onChange={e => setWeeks(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deload">Semanas de descarga</Label>
            <Input id="deload" value={deloadWeeks} onChange={e => setDeloadWeeks(e.target.value)} placeholder="Ej: 4, 8" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivo del bloque, notas para el atleta..." maxLength={1000} />
          </div>
        </CardContent>
      </Card>

      {schedule.map((day, dayIndex) => (
        <Card key={dayIndex}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={String(day.day)}
                onValueChange={v => v && updateDay(dayIndex, { day: Number(v) })}
                items={Object.fromEntries(DAY_NUMBERS.map(n => [String(n), `Día ${n}`]))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NUMBERS.map(n => (
                    <SelectItem key={n} value={String(n)}>Día {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={day.name}
                onChange={e => updateDay(dayIndex, { name: e.target.value })}
                placeholder="Nombre del día (ej: Sentadilla pesada)"
                className="max-w-xs"
                maxLength={50}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto text-red-600"
                onClick={() => removeDay(dayIndex)}
                disabled={schedule.length === 1}
                aria-label="Eliminar día"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500">
              <span className="col-span-4">Ejercicio</span>
              <span className="col-span-1">Series</span>
              <span className="col-span-1">Reps</span>
              <span className="col-span-2">Carga (kg / % RM)</span>
              <span className="col-span-1">RPE</span>
              <span className="col-span-2">Descanso (s)</span>
            </div>
            {day.exercises.map((ex, exIndex) => (
              <div key={exIndex} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 md:col-span-4">
                  <Select
                    value={ex.exercise_id || null}
                    onValueChange={v => v && updateExercise(dayIndex, exIndex, { exercise_id: v })}
                    items={exerciseItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona ejercicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(exercisesByCategory).map(([category, list]) => (
                        <SelectGroup key={category}>
                          <SelectLabel>{CATEGORY_LABELS[category] ?? category}</SelectLabel>
                          {list.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  className="col-span-3 md:col-span-1"
                  type="number" min={1} max={20} aria-label="Series"
                  value={ex.sets}
                  onChange={e => updateExercise(dayIndex, exIndex, { sets: Number(e.target.value) })}
                />
                <Input
                  className="col-span-3 md:col-span-1"
                  type="number" min={1} max={50} aria-label="Reps"
                  value={ex.reps}
                  onChange={e => updateExercise(dayIndex, exIndex, { reps: Number(e.target.value) })}
                />
                <div className="col-span-6 md:col-span-2 flex">
                  <Input
                    className="rounded-r-none"
                    type="number" min={0} step={ex.load_type === 'kg' ? 2.5 : 1}
                    placeholder={ex.load_type === 'kg' ? '100' : '75'}
                    aria-label={ex.load_type === 'kg' ? 'Carga en kg' : 'Carga en % del RM'}
                    value={ex.load_value ?? ''}
                    onChange={e => updateExercise(dayIndex, exIndex, { load_value: parseOptionalNumber(e.target.value) })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-14 shrink-0 rounded-l-none border-l-0"
                    onClick={() => updateExercise(dayIndex, exIndex, { load_type: ex.load_type === 'kg' ? 'percent' : 'kg' })}
                    title="Cambiar entre kg y % del RM"
                  >
                    {ex.load_type === 'kg' ? 'kg' : '% RM'}
                  </Button>
                </div>
                <Input
                  className="col-span-4 md:col-span-1"
                  type="number" min={1} max={10} step={0.5} placeholder="8" aria-label="RPE objetivo"
                  value={ex.rpe_target ?? ''}
                  onChange={e => updateExercise(dayIndex, exIndex, { rpe_target: parseOptionalNumber(e.target.value) })}
                />
                <Input
                  className="col-span-6 md:col-span-2"
                  type="number" min={0} max={600} step={15} placeholder="180" aria-label="Descanso en segundos"
                  value={ex.rest_seconds ?? ''}
                  onChange={e => updateExercise(dayIndex, exIndex, { rest_seconds: parseOptionalNumber(e.target.value) })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-2 md:col-span-1 justify-self-end text-gray-400 hover:text-red-600"
                  onClick={() => removeExercise(dayIndex, exIndex)}
                  disabled={day.exercises.length === 1}
                  aria-label="Eliminar ejercicio"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addExercise(dayIndex)}>
              <Plus className="mr-1 h-4 w-4" />
              Agregar ejercicio
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={addDay} disabled={schedule.length >= 7}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar día
        </Button>
        <NewExerciseDialog
          onCreated={exercise =>
            setExercises(prev => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)))
          }
        />
      </div>
    </form>
  )
}

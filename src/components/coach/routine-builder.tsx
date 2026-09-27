'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ArrowLeft, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRoutine, updateRoutine } from '@/actions/routines'
import { routineStructureSchema, formatReps, ROUTINE_GOALS, type RoutineStructure } from '@/lib/validations/routine'
import { NewExerciseDialog } from '@/components/coach/new-exercise-dialog'
import { RoutineStartPicker, type RoutineTemplate, type StartChoice } from '@/components/coach/routine-start-picker'

export interface ExerciseOption {
  id: string
  name: string
  category: string | null
  is_competition_lift: boolean | null
}

interface BuilderExercise {
  exercise_id: string
  sets: number
  /** "8" or a range "8-12" */
  repsText: string
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
  /** Personalized routine: saved for this athlete and assigned right away */
  athlete?: { id: string; full_name: string | null }
  templates?: RoutineTemplate[]
}

type Goal = NonNullable<RoutineStructure['goal']>

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

const emptyExercise = (loadType: LoadType = 'kg'): BuilderExercise => ({ exercise_id: '', sets: 3, repsText: '10', load_type: loadType })

// "8" → {reps: 8}; "8-12" / "8 a 12" → {reps: 8, reps_max: 12}
function parseReps(text: string): { reps: number; reps_max?: number } | null {
  const match = text.trim().match(/^(\d+)(?:\s*(?:-|–|a)\s*(\d+))?$/i)
  if (!match) return null
  const reps = Number(match[1])
  const max = match[2] ? Number(match[2]) : undefined
  if (max !== undefined && max < reps) return null
  return max && max > reps ? { reps, reps_max: max } : { reps }
}

function toBuilderDays(structure: RoutineStructure): BuilderDay[] {
  return structure.schedule.map(d => ({
    day: d.day,
    name: d.name,
    exercises: [...d.exercises]
      .sort((a, b) => a.order - b.order)
      .map(e => ({
        exercise_id: e.exercise_id,
        sets: e.sets,
        repsText: formatReps(e),
        ...parseLoad(e),
        rpe_target: e.rpe_target,
        rest_seconds: e.rest_seconds,
      })),
  }))
}

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

export function RoutineBuilder({ exercises: initialExercises, routine, athlete, templates = [] }: RoutineBuilderProps) {
  const router = useRouter()
  const initial = routine?.structure
  const athleteName = athlete?.full_name || undefined

  // New routines first pick a starting point (blank, preset or own template)
  const [started, setStarted] = useState(!!routine)
  const [name, setName] = useState(routine?.name ?? '')
  const [description, setDescription] = useState(routine?.description ?? '')
  const [goal, setGoal] = useState<Goal | undefined>(initial?.goal)
  const [weeks, setWeeks] = useState(initial?.weeks ?? 4)
  const [progression, setProgression] = useState<RoutineStructure['progression']>(initial?.progression ?? 'linear')
  const [deloadWeeks, setDeloadWeeks] = useState(initial?.deload_weeks?.join(', ') ?? '')
  const [schedule, setSchedule] = useState<BuilderDay[]>(
    initial ? toBuilderDays(initial) : [{ day: 1, name: 'Día 1', exercises: [emptyExercise()] }]
  )
  const [saving, setSaving] = useState(false)
  const [exercises, setExercises] = useState(initialExercises)

  function start(choice: StartChoice) {
    setName(choice.name)
    setDescription(choice.description)
    if (choice.structure) {
      setGoal(choice.structure.goal)
      setWeeks(choice.structure.weeks)
      setProgression(choice.structure.progression)
      setDeloadWeeks(choice.structure.deload_weeks?.join(', ') ?? '')
      setSchedule(toBuilderDays(choice.structure))
    }
    setStarted(true)
    window.scrollTo({ top: 0 })
  }

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

  function duplicateDay(index: number) {
    const used = new Set(schedule.map(d => d.day))
    const next = DAY_NUMBERS.find(n => !used.has(n))
    if (!next) {
      toast.error('Ya tienes 7 días en la semana')
      return
    }
    const source = schedule[index]
    setSchedule(prev => [
      ...prev,
      { day: next, name: `${source.name} (copia)`, exercises: source.exercises.map(e => ({ ...e })) },
    ])
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
    const badReps = schedule.flatMap(d => d.exercises).find(ex => !parseReps(ex.repsText))
    if (badReps) {
      toast.error(`Reps "${badReps.repsText}" no válidas: escribe un número (10) o un rango (8-12)`)
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
      ...(goal && { goal }),
      schedule: [...schedule]
        .sort((a, b) => a.day - b.day)
        .map(d => ({
          day: d.day,
          name: d.name.trim(),
          exercises: d.exercises.map((ex, order) => ({
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            ...parseReps(ex.repsText)!,
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
    if (athlete && !routine) formData.set('athlete_id', athlete.id)

    setSaving(true)
    const result = routine ? await updateRoutine(routine.id, formData) : await createRoutine(formData)
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (athlete && !routine) {
      toast.success(`Rutina asignada a ${athleteName ?? 'tu alumno'}. Ya la ve en su app.`)
      router.push('/coach/athletes')
    } else {
      toast.success(routine ? 'Rutina actualizada' : 'Plantilla creada')
      router.push('/coach/routines')
    }
    router.refresh()
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={athlete ? '/coach/athletes' : '/coach/routines'} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{athlete ? `Rutina para ${athleteName ?? 'tu alumno'}` : 'Nueva Plantilla'}</h1>
            <p className="text-gray-500 mt-1">
              {athlete ? 'Personalizada solo para este alumno.' : 'Una plantilla la puedes reutilizar con varios alumnos.'}
            </p>
          </div>
        </div>
        <RoutineStartPicker exercises={exercises} templates={templates} athleteName={athleteName} onPick={start} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={athlete && !routine ? '/coach/athletes' : '/coach/routines'} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {routine ? 'Editar Rutina' : athlete ? `Rutina para ${athleteName ?? 'tu alumno'}` : 'Nueva Plantilla'}
            </h1>
            <p className="text-gray-500 mt-1">
              {athlete && !routine ? 'Al guardar, se le asigna y la ve en su app.' : 'Días, ejercicios, series, reps y cargas.'}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? 'Guardando...' : athlete && !routine ? 'Guardar y asignar' : 'Guardar rutina'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(ROUTINE_GOALS) as [Goal, string][]).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={goal === value ? 'default' : 'outline'}
                  onClick={() => setGoal(goal === value ? undefined : value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Hipertrofia 3 días" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeks">Semanas</Label>
              <Input id="weeks" type="number" min={1} max={52} value={weeks} onChange={e => setWeeks(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Notas para el alumno</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivo, cómo progresar las cargas, calentamiento..." maxLength={1000} />
          </div>
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium text-gray-700">Opciones avanzadas</summary>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de progresión</Label>
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
                <Label htmlFor="deload">Semanas de descarga</Label>
                <Input id="deload" value={deloadWeeks} onChange={e => setDeloadWeeks(e.target.value)} placeholder="Ej: 4, 8" />
              </div>
            </div>
          </details>
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
                placeholder="Nombre del día (ej: Pecho y tríceps)"
                className="max-w-xs"
                maxLength={50}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto text-gray-500"
                onClick={() => duplicateDay(dayIndex)}
                disabled={schedule.length >= 7}
              >
                <Copy className="mr-1 h-4 w-4" />
                Duplicar día
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-600"
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
                  inputMode="numeric" placeholder="8-12" aria-label="Reps (número o rango)"
                  value={ex.repsText}
                  onChange={e => updateExercise(dayIndex, exIndex, { repsText: e.target.value })}
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

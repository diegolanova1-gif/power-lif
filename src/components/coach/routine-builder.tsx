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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRoutine, updateRoutine } from '@/actions/routines'
import { createExercise, type CreateExerciseInput } from '@/actions/exercises'
import { ExerciseCombobox } from '@/components/coach/exercise-combobox'
import { WEEKDAYS, weekdayName } from '@/lib/weekdays'
import { cn } from '@/lib/utils'
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

const DAY_NUMBERS = WEEKDAYS.map(w => w.day)

const sortDays = (days: BuilderDay[]) => [...days].sort((a, b) => a.day - b.day)

// Category for exercises created by typing a new name
function guessCategory(exerciseName: string): CreateExerciseInput['category'] {
  const n = exerciseName.toLowerCase()
  if (n.includes('sentadilla') || n.includes('squat')) return 'squat'
  if (n.includes('peso muerto') || n.includes('deadlift')) return 'deadlift'
  if (n.includes('banca') || n.includes('bench')) return 'bench'
  return 'accessory'
}

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
    initial ? toBuilderDays(initial) : []
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
    } else {
      setSchedule([])
    }
    setStarted(true)
    window.scrollTo({ top: 0 })
  }

  function updateDay(index: number, patch: Partial<BuilderDay>) {
    setSchedule(prev => sortDays(prev.map((d, i) => (i === index ? { ...d, ...patch } : d))))
  }

  // Weekday chips: tapping a day adds or removes its session
  function toggleWeekday(day: number) {
    const existing = schedule.find(d => d.day === day)
    if (!existing) {
      setSchedule(prev => sortDays([...prev, { day, name: '', exercises: [emptyExercise()] }]))
      return
    }
    const hasContent = existing.exercises.some(e => e.exercise_id)
    if (hasContent && !confirm(`¿Quitar el ${weekdayName(day)} y sus ejercicios?`)) return
    setSchedule(prev => prev.filter(d => d.day !== day))
  }

  function removeDay(index: number) {
    toggleWeekday(schedule[index].day)
  }

  function duplicateDay(index: number) {
    const source = schedule[index]
    const used = new Set(schedule.map(d => d.day))
    const next = [...DAY_NUMBERS.filter(n => n > source.day), ...DAY_NUMBERS].find(n => !used.has(n))
    if (!next) {
      toast.error('Ya entrena los 7 días')
      return
    }
    setSchedule(prev =>
      sortDays([...prev, { day: next, name: source.name, exercises: source.exercises.map(e => ({ ...e })) }])
    )
    toast.success(`Copiado al ${weekdayName(next)}`)
  }

  async function createExerciseInline(exerciseName: string): Promise<ExerciseOption | null> {
    const result = await createExercise({ name: exerciseName, category: guessCategory(exerciseName) })
    if (result.error || !result.exercise) {
      toast.error(result.error ?? 'No se pudo crear el ejercicio')
      return null
    }
    setExercises(prev => [...prev, result.exercise].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`"${result.exercise.name}" agregado a tus ejercicios`)
    return result.exercise
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

    if (schedule.length === 0) {
      toast.error('Elige al menos un día de entrenamiento')
      return
    }
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
          name: d.name.trim() || weekdayName(d.day),
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

      <Card>
        <CardHeader>
          <CardTitle>¿Qué días entrena?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(w => {
              const on = schedule.some(d => d.day === w.day)
              return (
                <button
                  key={w.day}
                  type="button"
                  onClick={() => toggleWeekday(w.day)}
                  aria-pressed={on}
                  className={cn(
                    'h-11 min-w-11 rounded-full border px-3 text-sm font-medium transition-colors',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <span className="sm:hidden">{w.short}</span>
                  <span className="hidden sm:inline">{w.name}</span>
                </button>
              )
            })}
          </div>
          <p className="text-sm text-gray-500">
            {schedule.length === 0
              ? 'Toca los días en que entrena el alumno.'
              : `${schedule.length} ${schedule.length === 1 ? 'día' : 'días'} por semana. Toca un día para agregarlo o quitarlo.`}
          </p>
        </CardContent>
      </Card>

      {schedule.map((day, dayIndex) => (
        <Card key={day.day}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-xl">{weekdayName(day.day)}</CardTitle>
              <Input
                value={day.name}
                onChange={e => updateDay(dayIndex, { name: e.target.value })}
                placeholder="Enfoque del día (ej: Pecho y tríceps)"
                aria-label={`Enfoque del ${weekdayName(day.day)}`}
                className="max-w-xs"
                maxLength={50}
              />
              <div className="ml-auto flex items-center gap-1">
                <Select
                  value={String(day.day)}
                  onValueChange={v => {
                    if (!v || Number(v) === day.day) return
                    if (schedule.some(d => d.day === Number(v))) {
                      toast.error(`El ${weekdayName(Number(v))} ya tiene entrenamiento`)
                      return
                    }
                    updateDay(dayIndex, { day: Number(v) })
                  }}
                  items={Object.fromEntries(WEEKDAYS.map(w => [String(w.day), 'Mover a otro día']))}
                >
                  <SelectTrigger className="w-auto text-gray-500" aria-label="Mover a otro día">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map(w => (
                      <SelectItem key={w.day} value={String(w.day)} disabled={w.day !== day.day && schedule.some(d => d.day === w.day)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="sm" className="text-gray-500" onClick={() => duplicateDay(dayIndex)} disabled={schedule.length >= 7}>
                  <Copy className="mr-1 h-4 w-4" />
                  Duplicar
                </Button>
                <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => removeDay(dayIndex)} aria-label={`Quitar ${weekdayName(day.day)}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.exercises.map((ex, exIndex) => (
              <div key={exIndex} className="rounded-lg border bg-gray-50/60 p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-500">Ejercicio {exIndex + 1}</Label>
                    <ExerciseCombobox
                      exercises={exercises}
                      value={ex.exercise_id}
                      onChange={id => updateExercise(dayIndex, exIndex, { exercise_id: id })}
                      onCreate={createExerciseInline}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => removeExercise(dayIndex, exIndex)}
                    disabled={day.exercises.length === 1}
                    aria-label="Quitar ejercicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Series</Label>
                    <Input
                      type="number" min={1} max={20} placeholder="ej: 4"
                      value={ex.sets}
                      onChange={e => updateExercise(dayIndex, exIndex, { sets: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Repeticiones</Label>
                    <Input
                      inputMode="numeric" placeholder="ej: 8-12"
                      value={ex.repsText}
                      onChange={e => updateExercise(dayIndex, exIndex, { repsText: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs text-gray-500">Peso <span className="text-gray-400">(opcional)</span></Label>
                    <div className="flex">
                      <Input
                        className="rounded-r-none"
                        type="number" min={0} step={ex.load_type === 'kg' ? 2.5 : 1}
                        placeholder={ex.load_type === 'kg' ? 'ej: 60' : 'ej: 75'}
                        value={ex.load_value ?? ''}
                        onChange={e => updateExercise(dayIndex, exIndex, { load_value: parseOptionalNumber(e.target.value) })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-16 shrink-0 rounded-l-none border-l-0"
                        onClick={() => updateExercise(dayIndex, exIndex, { load_type: ex.load_type === 'kg' ? 'percent' : 'kg' })}
                        title="Cambiar entre kilos y % del máximo (RM)"
                      >
                        {ex.load_type === 'kg' ? 'kg' : '% RM'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500" title="Esfuerzo percibido: 10 = al fallo, 8 = le quedan 2 reps">
                      RPE / esfuerzo <span className="text-gray-400">(1-10)</span>
                    </Label>
                    <Input
                      type="number" min={1} max={10} step={0.5} placeholder="ej: 8"
                      value={ex.rpe_target ?? ''}
                      onChange={e => updateExercise(dayIndex, exIndex, { rpe_target: parseOptionalNumber(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Descanso <span className="text-gray-400">(seg)</span></Label>
                    <Input
                      type="number" min={0} max={600} step={15} placeholder="ej: 90"
                      value={ex.rest_seconds ?? ''}
                      onChange={e => updateExercise(dayIndex, exIndex, { rest_seconds: parseOptionalNumber(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addExercise(dayIndex)}>
              <Plus className="mr-1 h-4 w-4" />
              Agregar ejercicio al {weekdayName(day.day).toLowerCase()}
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3">
        <NewExerciseDialog
          onCreated={exercise =>
            setExercises(prev => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)))
          }
        />
      </div>
    </form>
  )
}

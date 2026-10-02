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
import { routineStructureSchema, formatReps, scheduleForWeek, ROUTINE_GOALS, type RoutineStructure } from '@/lib/validations/routine'
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
  note?: string
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

function toBuilderDays(schedule: RoutineStructure['schedule']): BuilderDay[] {
  return schedule.map(d => ({
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
        note: e.note,
      })),
  }))
}

const cloneDays = (days: BuilderDay[]) => days.map(d => ({ ...d, exercises: d.exercises.map(e => ({ ...e })) }))

// Every week explicit in the builder (weeks without a plan repeat week 1)
function toBuilderWeeks(structure: RoutineStructure): BuilderDay[][] {
  return Array.from({ length: structure.weeks || 1 }, (_, i) => toBuilderDays(scheduleForWeek(structure, i + 1)))
}

function toStructureSchedule(days: BuilderDay[]): RoutineStructure['schedule'] {
  return sortDays(days).map(d => ({
    day: d.day,
    name: d.name.trim() || weekdayName(d.day),
    exercises: d.exercises.map((ex, order) => ({
      exercise_id: ex.exercise_id,
      sets: ex.sets,
      ...parseReps(ex.repsText)!,
      // intensity = readable text the athlete pages display
      ...(ex.load_value !== undefined && {
        load_type: ex.load_type,
        load_value: ex.load_value,
        intensity: formatLoad(ex.load_type, ex.load_value),
      }),
      ...(ex.rpe_target !== undefined && { rpe_target: ex.rpe_target }),
      ...(ex.rest_seconds !== undefined && { rest_seconds: ex.rest_seconds }),
      ...(ex.note?.trim() && { note: ex.note.trim() }),
      order,
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
  const [progression, setProgression] = useState<RoutineStructure['progression']>(initial?.progression ?? 'linear')
  const [deloadWeeks, setDeloadWeeks] = useState(initial?.deload_weeks?.join(', ') ?? '')
  // One schedule per week; training days are the same in every week
  const [weeksData, setWeeksData] = useState<BuilderDay[][]>(initial ? toBuilderWeeks(initial) : [[]])
  const [currentWeek, setCurrentWeek] = useState(0)
  const [saving, setSaving] = useState(false)
  const [exercises, setExercises] = useState(initialExercises)

  const weeks = weeksData.length
  const schedule = weeksData[currentWeek] ?? []

  // Edits apply to the week being viewed
  function setSchedule(updater: (prev: BuilderDay[]) => BuilderDay[]) {
    setWeeksData(prev => prev.map((w, i) => (i === currentWeek ? updater(w) : w)))
  }

  // Structural changes (which weekdays) apply to every week
  function setAllWeeks(updater: (prev: BuilderDay[], weekIndex: number) => BuilderDay[]) {
    setWeeksData(prev => prev.map((w, i) => sortDays(updater(w, i))))
  }

  function start(choice: StartChoice) {
    setName(choice.name)
    setDescription(choice.description)
    if (choice.structure) {
      setGoal(choice.structure.goal)
      setProgression(choice.structure.progression)
      setDeloadWeeks(choice.structure.deload_weeks?.join(', ') ?? '')
      setWeeksData(toBuilderWeeks(choice.structure))
    } else {
      setWeeksData([[]])
    }
    setCurrentWeek(0)
    setStarted(true)
    window.scrollTo({ top: 0 })
  }

  // --- Weeks ---

  function duplicateWeekToNext() {
    const copy = cloneDays(schedule)
    const nextIndex = currentWeek + 1
    if (nextIndex < weeks) {
      if (!confirm(`¿Reemplazar la semana ${nextIndex + 1} con una copia de la semana ${currentWeek + 1}?`)) return
      setWeeksData(prev => prev.map((w, i) => (i === nextIndex ? copy : w)))
    } else {
      if (weeks >= 52) {
        toast.error('Máximo 52 semanas')
        return
      }
      setWeeksData(prev => [...prev, copy])
    }
    setCurrentWeek(nextIndex)
    toast.success(`Semana ${currentWeek + 1} copiada a la semana ${nextIndex + 1}. Ahora ajusta lo que cambie.`)
  }

  function copyWeekToRemaining() {
    const remaining = weeks - currentWeek - 1
    if (remaining <= 0) return
    if (!confirm(`¿Copiar la semana ${currentWeek + 1} a las ${remaining} semanas siguientes? Se reemplaza su contenido.`)) return
    setWeeksData(prev => prev.map((w, i) => (i > currentWeek ? cloneDays(schedule) : w)))
    toast.success(`Copiada a las semanas ${currentWeek + 2} a ${weeks}`)
  }

  function removeWeek() {
    if (weeks === 1) return
    if (!confirm(`¿Eliminar la semana ${currentWeek + 1}?`)) return
    setWeeksData(prev => prev.filter((_, i) => i !== currentWeek))
    setCurrentWeek(i => Math.max(0, i - 1))
  }

  // --- Days ---

  function updateDay(index: number, patch: Partial<BuilderDay>) {
    const fromDay = schedule[index].day
    if (patch.day !== undefined && patch.day !== fromDay) {
      // Moving a weekday moves it in every week
      const toDay = patch.day
      setAllWeeks(w => w.map(d => (d.day === fromDay ? { ...d, day: toDay } : d)))
      return
    }
    setSchedule(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  // Weekday chips: tapping a day adds or removes its session (in every week)
  function toggleWeekday(day: number) {
    const existing = schedule.find(d => d.day === day)
    if (!existing) {
      setAllWeeks(w => [...w, { day, name: '', exercises: [emptyExercise()] }])
      return
    }
    const hasContent = weeksData.some(w => w.find(d => d.day === day)?.exercises.some(e => e.exercise_id))
    if (hasContent && !confirm(`¿Quitar el ${weekdayName(day)} y sus ejercicios de todas las semanas?`)) return
    setAllWeeks(w => w.filter(d => d.day !== day))
  }

  function removeDay(index: number) {
    toggleWeekday(schedule[index].day)
  }

  function duplicateDay(index: number) {
    const sourceDay = schedule[index].day
    const used = new Set(schedule.map(d => d.day))
    const next = [...DAY_NUMBERS.filter(n => n > sourceDay), ...DAY_NUMBERS].find(n => !used.has(n))
    if (!next) {
      toast.error('Ya entrena los 7 días')
      return
    }
    // Each week gets a copy of its own version of the source day
    setAllWeeks(w => {
      const source = w.find(d => d.day === sourceDay)
      return source ? [...w, { day: next, name: source.name, exercises: source.exercises.map(e => ({ ...e })) }] : w
    })
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

    if (weeksData[0].length === 0) {
      toast.error('Elige al menos un día de entrenamiento')
      return
    }
    // Validate every week, pointing at the first problem
    for (const [w, days] of weeksData.entries()) {
      const where = weeks > 1 ? ` (semana ${w + 1})` : ''
      const all = days.flatMap(d => d.exercises)
      if (all.some(ex => !ex.exercise_id)) {
        setCurrentWeek(w)
        toast.error(`Elige un ejercicio en cada recuadro${where}`)
        return
      }
      if (all.some(ex => ex.load_type === 'percent' && (ex.load_value ?? 0) > 110)) {
        setCurrentWeek(w)
        toast.error(`El % de RM no puede superar 110%${where}`)
        return
      }
      const badReps = all.find(ex => !parseReps(ex.repsText))
      if (badReps) {
        setCurrentWeek(w)
        toast.error(`Reps "${badReps.repsText}" no válidas${where}: escribe un número (10) o un rango (8-12)`)
        return
      }
    }

    const deload = deloadWeeks
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)

    const weekSchedules = weeksData.map(toStructureSchedule)
    const base = JSON.stringify(weekSchedules[0])
    const weekPlans = weekSchedules
      .map((schedule, i) => ({ week: i + 1, schedule }))
      .filter(p => p.week > 1 && JSON.stringify(p.schedule) !== base)

    const structure = {
      name: name.trim(),
      weeks,
      progression,
      ...(goal && { goal }),
      schedule: weekSchedules[0],
      ...(weekPlans.length > 0 && { week_plans: weekPlans }),
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
          <Link href={athlete ? '/coach/athletes' : '/coach/routines'} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{athlete ? `Rutina para ${athleteName ?? 'tu alumno'}` : 'Nueva Plantilla'}</h1>
            <p className="text-muted-foreground mt-1">
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
          <Link href={athlete && !routine ? '/coach/athletes' : '/coach/routines'} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {routine ? 'Editar Rutina' : athlete ? `Rutina para ${athleteName ?? 'tu alumno'}` : 'Nueva Plantilla'}
            </h1>
            <p className="text-muted-foreground mt-1">
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
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Hipertrofia 3 días" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Notas para el alumno</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivo, cómo progresar las cargas, calentamiento..." maxLength={1000} />
          </div>
          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground">Opciones avanzadas</summary>
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
                    on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  <span className="sm:hidden">{w.short}</span>
                  <span className="hidden sm:inline">{w.name}</span>
                </button>
              )
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {schedule.length === 0
              ? 'Toca los días en que entrena el alumno.'
              : `${schedule.length} ${schedule.length === 1 ? 'día' : 'días'} por semana. Toca un día para agregarlo o quitarlo.`}
          </p>
        </CardContent>
      </Card>

      {schedule.length > 0 && (
        <Card className="sticky top-16 z-30 border-primary/30 shadow-sm">
          <CardContent className="space-y-3 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {weeksData.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentWeek(i)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    i === currentWeek ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  Semana {i + 1}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={duplicateWeekToNext}>
                <Copy className="mr-1 h-4 w-4" />
                Duplicar semana {currentWeek + 1} → {currentWeek + 2}
              </Button>
              {currentWeek < weeks - 1 && (
                <Button type="button" size="sm" variant="outline" onClick={copyWeekToRemaining}>
                  Copiar a todas las siguientes
                </Button>
              )}
              {weeks > 1 && (
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={removeWeek}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Eliminar semana {currentWeek + 1}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Editando la <span className="font-mono font-semibold tabular-nums text-foreground">semana {currentWeek + 1}</span> de <span className="font-mono tabular-nums">{weeks}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <SelectTrigger className="w-auto text-muted-foreground" aria-label="Mover a otro día">
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
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => duplicateDay(dayIndex)} disabled={schedule.length >= 7}>
                  <Copy className="mr-1 h-4 w-4" />
                  Duplicar
                </Button>
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeDay(dayIndex)} aria-label={`Quitar ${weekdayName(day.day)}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.exercises.map((ex, exIndex) => (
              <div key={exIndex} className="rounded-lg border bg-muted/60 p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Ejercicio {exIndex + 1}</Label>
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
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeExercise(dayIndex, exIndex)}
                    disabled={day.exercises.length === 1}
                    aria-label="Quitar ejercicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Series</Label>
                    <Input
                      type="number" min={1} max={20} placeholder="ej: 4"
                      value={ex.sets}
                      onChange={e => updateExercise(dayIndex, exIndex, { sets: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Repeticiones</Label>
                    <Input
                      inputMode="numeric" placeholder="ej: 8-12"
                      value={ex.repsText}
                      onChange={e => updateExercise(dayIndex, exIndex, { repsText: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Peso <span className="text-muted-foreground">(opcional)</span></Label>
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
                    <Label className="text-xs text-muted-foreground" title="Esfuerzo percibido: 10 = al fallo, 8 = le quedan 2 reps">
                      RPE / esfuerzo <span className="text-muted-foreground">(1-10)</span>
                    </Label>
                    <Input
                      type="number" min={1} max={10} step={0.5} placeholder="ej: 8"
                      value={ex.rpe_target ?? ''}
                      onChange={e => updateExercise(dayIndex, exIndex, { rpe_target: parseOptionalNumber(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Descanso <span className="text-muted-foreground">(seg)</span></Label>
                    <Input
                      type="number" min={0} max={600} step={15} placeholder="ej: 90"
                      value={ex.rest_seconds ?? ''}
                      onChange={e => updateExercise(dayIndex, exIndex, { rest_seconds: parseOptionalNumber(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Nota para el alumno <span className="text-muted-foreground">(opcional, ej: "codos pegados al cuerpo")</span></Label>
                  <Input
                    value={ex.note ?? ''}
                    onChange={e => updateExercise(dayIndex, exIndex, { note: e.target.value })}
                    placeholder="Indicación técnica de este ejercicio"
                    maxLength={300}
                  />
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

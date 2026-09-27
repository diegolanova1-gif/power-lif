import type { RoutineStructure } from '@/lib/validations/routine'

// [exercise name in catalog, sets, reps, reps_max?, extras?]
type PresetExercise = [
  name: string,
  sets: number,
  reps: number,
  repsMax?: number,
  extras?: { percent?: number; rpe?: number; rest?: number },
]

export interface RoutinePreset {
  id: string
  name: string
  description: string
  goal: NonNullable<RoutineStructure['goal']>
  weeks: number
  progression: RoutineStructure['progression']
  days: { name: string; exercises: PresetExercise[] }[]
}

export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: 'ppl',
    name: 'Hipertrofia · Push / Pull / Legs',
    description: '3 días. Empuje, tirón y pierna. Rangos de 8 a 15 reps.',
    goal: 'hypertrophy',
    weeks: 6,
    progression: 'linear',
    days: [
      {
        name: 'Push (pecho, hombro, tríceps)',
        exercises: [
          ['Press de Banca', 4, 8, 10, { rest: 120 }],
          ['Press Inclinado', 3, 10, 12, { rest: 90 }],
          ['Press Militar con Mancuernas', 3, 10, 12, { rest: 90 }],
          ['Elevaciones Laterales', 3, 12, 15, { rest: 60 }],
          ['Extensión de Tríceps en Polea', 3, 12, 15, { rest: 60 }],
        ],
      },
      {
        name: 'Pull (espalda, bíceps)',
        exercises: [
          ['Dominadas', 4, 6, 10, { rest: 120 }],
          ['Remo con Barra', 4, 8, 10, { rest: 90 }],
          ['Jalón al Pecho', 3, 10, 12, { rest: 90 }],
          ['Face Pulls', 3, 12, 15, { rest: 60 }],
          ['Curl de Bíceps', 3, 10, 12, { rest: 60 }],
        ],
      },
      {
        name: 'Legs (pierna)',
        exercises: [
          ['Sentadilla', 4, 6, 8, { rest: 150 }],
          ['Peso Muerto Rumano', 3, 8, 10, { rest: 120 }],
          ['Prensa de Piernas', 3, 10, 12, { rest: 90 }],
          ['Curl Femoral', 3, 10, 12, { rest: 60 }],
          ['Elevación de Gemelos', 4, 12, 15, { rest: 60 }],
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Hipertrofia · Torso / Pierna',
    description: '4 días. Cada grupo muscular 2 veces por semana.',
    goal: 'hypertrophy',
    weeks: 8,
    progression: 'linear',
    days: [
      {
        name: 'Torso A',
        exercises: [
          ['Press de Banca', 4, 6, 8, { rest: 120 }],
          ['Remo con Barra', 4, 6, 8, { rest: 120 }],
          ['Press Militar', 3, 8, 10, { rest: 90 }],
          ['Jalón al Pecho', 3, 10, 12, { rest: 90 }],
          ['Curl de Bíceps', 2, 10, 12, { rest: 60 }],
          ['Extensiones de Tríceps', 2, 10, 12, { rest: 60 }],
        ],
      },
      {
        name: 'Pierna A',
        exercises: [
          ['Sentadilla', 4, 6, 8, { rest: 150 }],
          ['Peso Muerto Rumano', 3, 8, 10, { rest: 120 }],
          ['Zancadas', 3, 10, 12, { rest: 90 }],
          ['Extensión de Cuádriceps', 3, 12, 15, { rest: 60 }],
          ['Elevación de Gemelos', 3, 12, 15, { rest: 60 }],
        ],
      },
      {
        name: 'Torso B',
        exercises: [
          ['Press Inclinado', 4, 8, 10, { rest: 120 }],
          ['Dominadas', 4, 6, 10, { rest: 120 }],
          ['Press con Mancuernas', 3, 10, 12, { rest: 90 }],
          ['Remo en Polea Baja', 3, 10, 12, { rest: 90 }],
          ['Elevaciones Laterales', 3, 12, 15, { rest: 60 }],
          ['Curl Martillo', 2, 10, 12, { rest: 60 }],
        ],
      },
      {
        name: 'Pierna B',
        exercises: [
          ['Peso Muerto', 3, 5, 6, { rest: 180 }],
          ['Prensa de Piernas', 4, 10, 12, { rest: 90 }],
          ['Hip Thrust', 3, 8, 12, { rest: 90 }],
          ['Curl Femoral', 3, 10, 12, { rest: 60 }],
          ['Elevación de Piernas Colgado', 3, 10, 15, { rest: 60 }],
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body · Principiante',
    description: '3 días, todo el cuerpo. Ideal para empezar o volver a entrenar.',
    goal: 'general',
    weeks: 4,
    progression: 'linear',
    days: [
      {
        name: 'Full Body A',
        exercises: [
          ['Sentadilla Goblet', 3, 10, 12, { rest: 90 }],
          ['Press con Mancuernas', 3, 10, 12, { rest: 90 }],
          ['Jalón al Pecho', 3, 10, 12, { rest: 90 }],
          ['Hip Thrust', 3, 10, 12, { rest: 90 }],
          ['Rueda Abdominal', 3, 8, 12, { rest: 60 }],
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          ['Prensa de Piernas', 3, 10, 12, { rest: 90 }],
          ['Press Militar con Mancuernas', 3, 10, 12, { rest: 90 }],
          ['Remo con Mancuerna', 3, 10, 12, { rest: 90 }],
          ['Curl Femoral', 3, 10, 12, { rest: 60 }],
          ['Rueda Abdominal', 3, 8, 12, { rest: 60 }],
        ],
      },
      {
        name: 'Full Body C',
        exercises: [
          ['Zancadas', 3, 10, 12, { rest: 90 }],
          ['Press Inclinado', 3, 10, 12, { rest: 90 }],
          ['Remo en Polea Baja', 3, 10, 12, { rest: 90 }],
          ['Peso Muerto Rumano con Mancuernas', 3, 10, 12, { rest: 90 }],
          ['Elevación de Gemelos', 3, 12, 15, { rest: 60 }],
        ],
      },
    ],
  },
  {
    id: 'strength-5x5',
    name: 'Fuerza · 5×5',
    description: '3 días con los básicos. Subí la carga cada semana si completás las 5×5.',
    goal: 'strength',
    weeks: 8,
    progression: 'linear',
    days: [
      {
        name: 'Día A',
        exercises: [
          ['Sentadilla', 5, 5, undefined, { rest: 180 }],
          ['Press de Banca', 5, 5, undefined, { rest: 180 }],
          ['Remo con Barra', 5, 5, undefined, { rest: 120 }],
        ],
      },
      {
        name: 'Día B',
        exercises: [
          ['Sentadilla', 5, 5, undefined, { rest: 180 }],
          ['Press Militar', 5, 5, undefined, { rest: 180 }],
          ['Peso Muerto', 1, 5, undefined, { rest: 180 }],
        ],
      },
      {
        name: 'Día C',
        exercises: [
          ['Sentadilla', 5, 5, undefined, { rest: 180 }],
          ['Press de Banca', 5, 5, undefined, { rest: 180 }],
          ['Dominadas', 3, 6, 8, { rest: 120 }],
        ],
      },
    ],
  },
  {
    id: 'powerlifting-4',
    name: 'Powerlifting · 4 días',
    description: 'Sentadilla, banca y peso muerto con % del RM y RPE.',
    goal: 'powerlifting',
    weeks: 8,
    progression: 'block',
    days: [
      {
        name: 'Sentadilla pesada + banca',
        exercises: [
          ['Sentadilla', 4, 4, undefined, { percent: 80, rpe: 8, rest: 180 }],
          ['Press de Banca', 4, 6, undefined, { percent: 72, rpe: 7, rest: 150 }],
          ['Remo con Barra', 3, 8, 10, { rest: 90 }],
        ],
      },
      {
        name: 'Banca pesada + peso muerto',
        exercises: [
          ['Press de Banca', 5, 3, undefined, { percent: 82, rpe: 8, rest: 180 }],
          ['Peso Muerto', 3, 4, undefined, { percent: 75, rpe: 7, rest: 180 }],
          ['Press con Agarre Cerrado', 3, 8, undefined, { rest: 90 }],
        ],
      },
      {
        name: 'Sentadilla técnica + accesorios',
        exercises: [
          ['Sentadilla con Pausa', 4, 4, undefined, { percent: 68, rpe: 7, rest: 150 }],
          ['Peso Muerto Rumano', 3, 8, undefined, { rest: 120 }],
          ['Zancadas', 3, 10, undefined, { rest: 90 }],
        ],
      },
      {
        name: 'Peso muerto pesado + banca volumen',
        exercises: [
          ['Peso Muerto', 4, 3, undefined, { percent: 82, rpe: 8, rest: 210 }],
          ['Press con Pausa', 4, 5, undefined, { percent: 70, rpe: 7, rest: 150 }],
          ['Dominadas', 3, 6, 8, { rest: 120 }],
        ],
      },
    ],
  },
]

/**
 * Turns a preset into a routine structure using the coach's visible catalog.
 * Exercises not found by name are skipped (and returned so the UI can say so).
 */
export function buildPresetStructure(preset: RoutinePreset, exercises: { id: string; name: string }[]) {
  const idByName = new Map(exercises.map(e => [e.name.toLowerCase(), e.id]))
  const missing: string[] = []

  const schedule = preset.days.map((day, i) => ({
    day: i + 1,
    name: day.name,
    exercises: day.exercises.flatMap(([name, sets, reps, repsMax, extras], order) => {
      const id = idByName.get(name.toLowerCase())
      if (!id) {
        missing.push(name)
        return []
      }
      return [{
        exercise_id: id,
        sets,
        reps,
        ...(repsMax && { reps_max: repsMax }),
        ...(extras?.percent && { load_type: 'percent' as const, load_value: extras.percent, intensity: `${extras.percent}% RM` }),
        ...(extras?.rpe && { rpe_target: extras.rpe }),
        ...(extras?.rest && { rest_seconds: extras.rest }),
        order,
      }]
    }),
  }))

  const structure: RoutineStructure = {
    name: preset.name,
    weeks: preset.weeks,
    progression: preset.progression,
    goal: preset.goal,
    schedule,
  }
  return { structure, missing: [...new Set(missing)] }
}

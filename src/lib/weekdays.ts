// Routine `day` values are weekdays: 1 = Lunes ... 7 = Domingo
export const WEEKDAYS = [
  { day: 1, name: 'Lunes', short: 'Lu' },
  { day: 2, name: 'Martes', short: 'Ma' },
  { day: 3, name: 'Miércoles', short: 'Mi' },
  { day: 4, name: 'Jueves', short: 'Ju' },
  { day: 5, name: 'Viernes', short: 'Vi' },
  { day: 6, name: 'Sábado', short: 'Sá' },
  { day: 7, name: 'Domingo', short: 'Do' },
] as const

export function weekdayName(day: number) {
  return WEEKDAYS.find(w => w.day === day)?.name ?? `Día ${day}`
}

export function weekdayShort(day: number) {
  return WEEKDAYS.find(w => w.day === day)?.short ?? String(day)
}

// Sensible default spread when a preset has N sessions per week
const DEFAULT_SPREAD: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
}

export function defaultTrainingDays(sessions: number) {
  return DEFAULT_SPREAD[Math.min(Math.max(sessions, 1), 7)]
}

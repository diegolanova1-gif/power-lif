import type { Tables } from '@/types/database'
import { scheduleForWeek, type RoutineStructure } from '@/lib/validations/routine'
import { mondayOf } from '@/lib/schedule-dates'

// sessions_per_week comes from the routine structure (schedule length) when the caller has it
export type AthleteRoutine = Tables<'athlete_routines'> & { sessions_per_week?: number }
// Minimal shape needed by adherence calcs
type SetLog = Pick<Tables<'sets_log'>, 'week' | 'day' | 'completed_at'> &
  Partial<Pick<Tables<'sets_log'>, 'rpe'>>

/**
 * Calculate adherence percentage for an athlete routine
 * Adherence = (completed sessions / prescribed sessions) * 100
 */
export function calculateAdherence(
  athleteRoutine: AthleteRoutine,
  setsLog: SetLog[]
): number {
  if (!athleteRoutine) return 0

  // Parse routine structure to get total prescribed sessions
  // For now, estimate based on weeks * sessions per week
  // In a real implementation, this would come from the routine structure JSON
  const weeksElapsed = getWeeksElapsed(athleteRoutine)
  const sessionsPerWeek = estimateSessionsPerWeek(athleteRoutine) // Default 4
  const prescribedSessions = weeksElapsed * sessionsPerWeek

  if (prescribedSessions <= 0) return 100

  // Count unique completed sessions (week + day combinations)
  const completedSessions = new Set(
    setsLog.map((s) => `${s.week}-${s.day}`)
  ).size

  return Math.min(100, Math.round((completedSessions / prescribedSessions) * 100))
}

/**
 * Calculate weekly adherence
 */
export function calculateWeeklyAdherence(
  athleteRoutine: AthleteRoutine,
  setsLog: SetLog[],
  targetWeek: number
): number {
  const weekSets = setsLog.filter((s) => s.week === targetWeek)
  const completedDays = new Set(weekSets.map((s) => s.day)).size
  const prescribedDays = estimateSessionsPerWeek(athleteRoutine)

  if (prescribedDays <= 0) return 100

  return Math.min(100, Math.round((completedDays / prescribedDays) * 100))
}

// App's userbase is Argentina (ART, UTC-3); there's no per-user timezone
// stored yet. `completed_at` is a real instant (timestamptz) so it needs this
// shift before truncating to a calendar day, or a session logged late at
// night lands on the wrong day in the heatmap. `started_at` is already a
// plain DATE column, not an instant, so it does NOT need this shift.
const LOCAL_UTC_OFFSET_HOURS = -3

function completedAtToLocalDateKey(completedAt: string): string {
  const shifted = new Date(new Date(completedAt).getTime() + LOCAL_UTC_OFFSET_HOURS * 60 * 60 * 1000)
  return shifted.toISOString().split('T')[0]
}

/**
 * Get adherence heatmap data for calendar view
 */
export function getAdherenceHeatmap(
  athleteRoutine: AthleteRoutine,
  setsLog: SetLog[],
  weeks: number = 12
): Array<{ date: string; completed: boolean; intensity?: number }> {
  const startDate = new Date(athleteRoutine.started_at)
  const heatmap: Array<{ date: string; completed: boolean; intensity?: number }> = []

  // Group sets by date (using completed_at, shifted to local calendar day)
  const setsByDate = new Map<string, SetLog[]>()
  for (const set of setsLog) {
    const date = completedAtToLocalDateKey(set.completed_at)
    if (!setsByDate.has(date)) {
      setsByDate.set(date, [])
    }
    setsByDate.get(date)!.push(set)
  }

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const daySets = setsByDate.get(dateStr)
    const completed = daySets !== undefined && daySets.length > 0

    heatmap.push({
      date: dateStr,
      completed,
      intensity: daySets ? calculateSessionIntensity(daySets) : undefined,
    })
  }

  return heatmap
}

function calculateSessionIntensity(sets: SetLog[]): number {
  if (sets.length === 0) return 0
  // Average RPE as intensity proxy
  const withRPE = sets.filter(s => s.rpe !== null)
  if (withRPE.length === 0) return 0
  return withRPE.reduce((sum, s) => sum + (s.rpe || 0), 0) / withRPE.length
}

function getWeeksElapsed(athleteRoutine: AthleteRoutine): number {
  const start = new Date(athleteRoutine.started_at)
  const now = new Date()
  const diffTime = now.getTime() - start.getTime()
  if (diffTime <= 0) return 0 // started_at is in the future: program hasn't begun

  const elapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  // Once finished, freeze the denominator at the last active week instead of
  // letting it keep growing with real time (adherence would otherwise drop
  // forever after the athlete actually completed the program).
  return athleteRoutine.status === 'completed' ? Math.min(elapsed, athleteRoutine.current_week) : elapsed
}

function estimateSessionsPerWeek(routine: AthleteRoutine): number {
  // Fallback: common powerlifting frequency
  return routine.sessions_per_week || 4
}

export type ExtraType = 'advance_credit' | 'advance_no_credit' | 'freeform' | null

// Minimal shape needed to compute the streak: which (week, day) got worked,
// on what real date, and whether it was a normal session or one of the 3
// "día extra" variants.
export type StreakSetLog = Pick<Tables<'sets_log'>, 'week' | 'day' | 'exercise_id' | 'completed_at'> & {
  extra_type?: ExtraType
}

export interface StreakInfo {
  streak: number
  currentWeekDays: number
  currentWeekRequired: number
}

const mondayKey = (date: Date) => mondayOf(date).toISOString().split('T')[0]

function shiftWeekKey(weekKey: string, weeks: number): string {
  const d = new Date(`${weekKey}T00:00:00`)
  d.setDate(d.getDate() + weeks * 7)
  return mondayKey(d)
}

/**
 * Racha = días reales distintos entrenados, evaluados por semana calendario
 * real (lunes-domingo). Una semana ya cerrada que no llegó a los N días
 * pautados corta la racha; la semana en curso suma en caliente, optimista.
 * Las 3 variantes de "día extra" suman todas — "advance_credit" además le
 * resta un día al requisito de la semana real SIGUIENTE.
 */
export function calculateStreak(setsLog: StreakSetLog[], structure: RoutineStructure): StreakInfo {
  const baseRequired = scheduleForWeek(structure, 1).length

  // One "session" per (week, day) of the routine — except freeform, which
  // isn't tied to a prescribed day and always counts on its own real date.
  const bySessionKey = new Map<string, StreakSetLog[]>()
  const freeformDateKeys: string[] = []
  for (const row of setsLog) {
    if (row.extra_type === 'freeform') {
      freeformDateKeys.push(completedAtToLocalDateKey(row.completed_at))
      continue
    }
    const key = `${row.week}-${row.day}`
    const list = bySessionKey.get(key)
    if (list) list.push(row)
    else bySessionKey.set(key, [row])
  }

  const trainedDateKeys = new Set<string>(freeformDateKeys)
  const creditDateKeys: string[] = []

  for (const [key, rows] of bySessionKey) {
    const [week, day] = key.split('-').map(Number)
    const daySchedule = scheduleForWeek(structure, week).find(d => d.day === day)
    if (!daySchedule) continue

    const countByExercise = new Map<string, number>()
    for (const r of rows) countByExercise.set(r.exercise_id, (countByExercise.get(r.exercise_id) ?? 0) + 1)
    const complete = daySchedule.exercises.every(e => (countByExercise.get(e.exercise_id) ?? 0) >= e.sets)
    if (!complete) continue

    const dateKeys = rows.map(r => completedAtToLocalDateKey(r.completed_at))
    const sessionDateKey = dateKeys.reduce((min, d) => (d < min ? d : min))
    trainedDateKeys.add(sessionDateKey)
    if (rows[0].extra_type === 'advance_credit') creditDateKeys.push(sessionDateKey)
  }

  const weekTally = new Map<string, number>()
  for (const dateKey of trainedDateKeys) {
    const wk = mondayKey(new Date(`${dateKey}T00:00:00`))
    weekTally.set(wk, (weekTally.get(wk) ?? 0) + 1)
  }
  const creditByWeek = new Map<string, number>()
  for (const dateKey of creditDateKeys) {
    const wk = mondayKey(new Date(`${dateKey}T00:00:00`))
    creditByWeek.set(wk, (creditByWeek.get(wk) ?? 0) + 1)
  }

  // Credit earned in a week discounts the FOLLOWING real week's requirement.
  const requiredFor = (weekKey: string) => Math.max(0, baseRequired - (creditByWeek.get(shiftWeekKey(weekKey, -1)) ?? 0))

  const currentWeekKey = mondayKey(new Date())
  const currentWeekDays = weekTally.get(currentWeekKey) ?? 0
  const currentWeekRequired = requiredFor(currentWeekKey)

  let streak = currentWeekDays
  let cursor = shiftWeekKey(currentWeekKey, -1)
  while (true) {
    const done = weekTally.get(cursor) ?? 0
    if (done < requiredFor(cursor)) break
    streak += done
    cursor = shiftWeekKey(cursor, -1)
  }

  return { streak, currentWeekDays, currentWeekRequired }
}
import type { Tables } from '@/types/database'

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

/**
 * Calculate streak (consecutive weeks with > 0 sessions)
 */
export function calculateStreak(setsLog: SetLog[]): number {
  if (setsLog.length === 0) return 0

  // Group by week
  const weeksWithSessions = new Set(setsLog.map(s => s.week))
  const sortedWeeks = Array.from(weeksWithSessions).sort((a, b) => b - a)

  let streak = 0
  let expectedWeek = Math.max(...sortedWeeks)

  for (const week of sortedWeeks) {
    if (week === expectedWeek) {
      streak++
      expectedWeek--
    } else {
      break
    }
  }

  return streak
}
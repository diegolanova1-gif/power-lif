import type { Tables } from '@/types/database'

export type AthleteRoutine = Tables<'athlete_routines'>
export type SetLog = Tables<'sets_log'>

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
  const weeksElapsed = getWeeksElapsed(athleteRoutine.started_at)
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

  // Group sets by date (using completed_at)
  const setsByDate = new Map<string, SetLog[]>()
  for (const set of setsLog) {
    const date = set.completed_at.split('T')[0]
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

function getWeeksElapsed(startedAt: string): number {
  const start = new Date(startedAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
}

function estimateSessionsPerWeek(routine: AthleteRoutine): number {
  // This would ideally come from routine.structure
  // For now, return a default based on common powerlifting frequencies
  return 4
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
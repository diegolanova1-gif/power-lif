import type { createServerClient } from '@supabase/ssr'
import { calculateStreak, type StreakSetLog } from '@/lib/calculations/adherence'
import { MILESTONES, type Milestone } from '@/lib/achievements'
import type { RoutineStructure } from '@/lib/validations/routine'

type Supabase = ReturnType<typeof createServerClient>

/**
 * Computes the athlete's streak and unlocks any achievement they've now
 * earned. Achievements are permanent, so this is safe to call on every view —
 * already-unlocked ones are skipped. Only writes when `canUnlock` is true
 * (the athlete's own session): RLS requires athlete_id = auth.uid() on
 * insert, so a coach viewing this just reads what's already unlocked.
 */
export async function getStreakAndAchievements(supabase: Supabase, athleteId: string, structure: RoutineStructure, canUnlock: boolean) {
  const { data: allSets } = await supabase
    .from('sets_log')
    .select('week, day, exercise_id, completed_at, extra_type')
    .eq('athlete_id', athleteId)
    .order('completed_at', { ascending: true })

  const { streak, currentWeekDays, currentWeekRequired, firstWeekCompleted, monthCompleted } = calculateStreak(
    (allSets ?? []) as StreakSetLog[],
    structure
  )

  const { data: existing } = await supabase.from('streak_achievements').select('milestone').eq('athlete_id', athleteId)
  const unlockedSet = new Set<string>(existing?.map(r => r.milestone as string) ?? [])
  const isUnlocked = (m: Milestone) => (m.type === 'days' ? streak >= (m.days ?? Infinity) : m.type === 'first_week' ? firstWeekCompleted : monthCompleted)

  if (canUnlock) {
    const toUnlock = MILESTONES.filter(m => isUnlocked(m) && !unlockedSet.has(m.id))
    if (toUnlock.length) {
      await supabase.from('streak_achievements').upsert(
        toUnlock.map(m => ({ athlete_id: athleteId, milestone: m.id })),
        { onConflict: 'athlete_id,milestone', ignoreDuplicates: true }
      )
      toUnlock.forEach(m => unlockedSet.add(m.id))
    }
  }

  return { streak, currentWeekDays, currentWeekRequired, unlockedMilestones: [...unlockedSet] }
}

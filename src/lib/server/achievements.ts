import type { createServerClient } from '@supabase/ssr'
import { calculateStreak, type StreakSetLog } from '@/lib/calculations/adherence'
import { STREAK_CARDS } from '@/lib/achievements'
import type { RoutineStructure } from '@/lib/validations/routine'

type Supabase = ReturnType<typeof createServerClient>

/**
 * Computes the athlete's streak and unlocks any Carta de Racha they've now
 * earned (streak >= card.requiredDays). Cards are permanent, so this is safe
 * to call on every view — already-unlocked ones are skipped. Only writes
 * when `canUnlock` is true (the athlete's own session): RLS requires
 * athlete_id = auth.uid() on insert, so a coach viewing this just reads
 * what's already unlocked.
 */
export async function getStreakAndAchievements(supabase: Supabase, athleteId: string, structure: RoutineStructure, canUnlock: boolean) {
  const { data: allSets } = await supabase
    .from('sets_log')
    .select('week, day, exercise_id, completed_at, extra_type')
    .eq('athlete_id', athleteId)
    .order('completed_at', { ascending: true })

  const { streak, currentWeekDays, currentWeekRequired } = calculateStreak((allSets ?? []) as StreakSetLog[], structure)

  const { data: existing } = await supabase.from('streak_achievements').select('milestone, unlocked_at').eq('athlete_id', athleteId)
  const unlockedAt = new Map<string, string>(existing?.map(r => [r.milestone as string, r.unlocked_at as string]) ?? [])

  if (canUnlock) {
    const toUnlock = STREAK_CARDS.filter(c => streak >= c.requiredDays && !unlockedAt.has(c.id))
    if (toUnlock.length) {
      const now = new Date().toISOString()
      await supabase.from('streak_achievements').upsert(
        toUnlock.map(c => ({ athlete_id: athleteId, milestone: c.id, unlocked_at: now })),
        { onConflict: 'athlete_id,milestone', ignoreDuplicates: true }
      )
      toUnlock.forEach(c => unlockedAt.set(c.id, now))
    }
  }

  // Filtra ids viejos (logros previos a la colección de 50 cartas) que
  // puedan seguir en la tabla pero ya no corresponden a ninguna carta.
  const unlockedCards = STREAK_CARDS.map(c => c.id).filter(id => unlockedAt.has(id))
  const unlockedDates = Object.fromEntries(unlockedCards.map(id => [id, unlockedAt.get(id)!]))

  return { streak, currentWeekDays, currentWeekRequired, unlockedCards, unlockedDates }
}

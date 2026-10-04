import { toast } from 'sonner'
import { MILESTONES } from '@/lib/achievements'

const storageKey = (userId: string) => `power-routine:seen-milestones:${userId}`

/**
 * Toasts any milestone that's unlocked but hasn't been celebrated yet on
 * this device, then remembers it (localStorage) so it only fires once.
 * Achievements unlock silently server-side on every stats fetch — this is
 * what turns that into the "you just earned it" moment.
 */
export function celebrateNewMilestones(unlockedMilestones: string[], userId: string) {
  if (typeof window === 'undefined' || !userId) return

  let seen: string[] = []
  try {
    seen = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]')
  } catch {
    seen = []
  }
  const seenSet = new Set(seen)
  const fresh = unlockedMilestones.filter(id => !seenSet.has(id))
  if (fresh.length === 0) return

  for (const id of fresh) {
    const milestone = MILESTONES.find(m => m.id === id)
    if (milestone) toast.success(`¡Desbloqueaste "${milestone.label}"! 🔥`, { description: milestone.description })
  }

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...seenSet, ...fresh]))
  } catch {
    // Storage full/unavailable: worst case the toast repeats next visit.
  }
}

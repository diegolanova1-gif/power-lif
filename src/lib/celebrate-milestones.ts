import { toast } from 'sonner'
import { STREAK_CARDS } from '@/lib/achievements'

const storageKey = (userId: string) => `power-routine:seen-cards:${userId}`

/**
 * Toasts any Carta de Racha that's unlocked but hasn't been celebrated yet on
 * this device, then remembers it (localStorage) so it only fires once.
 * Cards unlock silently server-side on every stats fetch — this is what
 * turns that into the "la desbloqueaste" moment.
 */
export function celebrateNewMilestones(unlockedCards: string[], userId: string) {
  if (typeof window === 'undefined' || !userId) return

  let seen: string[] = []
  try {
    seen = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]')
  } catch {
    seen = []
  }
  const seenSet = new Set(seen)
  const fresh = unlockedCards.filter(id => !seenSet.has(id))
  if (fresh.length === 0) return

  for (const id of fresh) {
    const card = STREAK_CARDS.find(c => c.id === id)
    if (card) toast.success(`Desbloqueaste "${card.name.toUpperCase()}"`, { description: `Carta ${String(card.number).padStart(3, '0')} / 050` })
  }

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...seenSet, ...fresh]))
  } catch {
    // Storage full/unavailable: worst case the toast repeats next visit.
  }
}

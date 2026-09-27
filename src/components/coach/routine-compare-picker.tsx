'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RoutineComparePickerProps {
  routines: { id: string; name: string }[]
  a: string | null
  b: string | null
}

export function RoutineComparePicker({ routines, a, b }: RoutineComparePickerProps) {
  const router = useRouter()
  const items = Object.fromEntries(routines.map(r => [r.id, r.name]))

  function select(side: 'a' | 'b', id: string | null) {
    if (!id) return
    const params = new URLSearchParams()
    const next = { a, b, [side]: id }
    if (next.a) params.set('a', next.a)
    if (next.b) params.set('b', next.b)
    router.replace(`/coach/routines/compare?${params}`, { scroll: false })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(['a', 'b'] as const).map(side => (
        <Select key={side} value={side === 'a' ? a : b} onValueChange={id => select(side, id)} items={items}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={side === 'a' ? 'Rutina A' : 'Rutina B'} />
          </SelectTrigger>
          <SelectContent>
            {routines.map(r => (
              <SelectItem key={r.id} value={r.id} disabled={r.id === (side === 'a' ? b : a)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}

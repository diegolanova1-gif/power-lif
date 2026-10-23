'use client'

import { Lightbulb } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function FeedbackMenuItem() {
  return (
    <DropdownMenuItem onClick={() => window.dispatchEvent(new Event('open-feedback'))}>
      <Lightbulb className="h-4 w-4" />
      Sugerencias
    </DropdownMenuItem>
  )
}

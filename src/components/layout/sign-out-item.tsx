'use client'

import { LogOut } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

export function SignOutItem() {
  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <DropdownMenuItem
      onClick={signOut}
      className="flex items-center gap-2 text-destructive focus:text-destructive"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </DropdownMenuItem>
  )
}

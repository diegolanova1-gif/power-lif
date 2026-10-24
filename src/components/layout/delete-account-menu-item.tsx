'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { DeleteAccountDialog } from '@/components/layout/delete-account-dialog'

export function DeleteAccountMenuItem() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true) }} className="text-destructive focus:text-destructive">
        <Trash2 className="h-4 w-4" />
        Dar de baja mi cuenta
      </DropdownMenuItem>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

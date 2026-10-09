'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface OneTimeNoticeProps {
  athleteId: string
  noticeKey: string
  title: string
  message: string
}

export function OneTimeNotice({ athleteId, noticeKey, title, message }: OneTimeNoticeProps) {
  const [open, setOpen] = useState(true)
  const [dismissing, setDismissing] = useState(false)

  async function dismiss() {
    setDismissing(true)
    const supabase = createClient()
    await supabase.from('athlete_notices').upsert(
      { athlete_id: athleteId, notice_key: noticeKey },
      { onConflict: 'athlete_id,notice_key', ignoreDuplicates: true }
    )
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={next => !next && dismiss()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="whitespace-pre-wrap text-foreground">{message}</DialogDescription>
        <Button className="mt-4 w-full" onClick={dismiss} disabled={dismissing}>
          Continuar
        </Button>
      </DialogContent>
    </Dialog>
  )
}

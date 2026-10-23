'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const NEXT_STATUS: Record<string, string> = {
  pending: 'reviewed',
  reviewed: 'resolved',
}

const ACTION_LABEL: Record<string, string> = {
  pending: 'Marcar revisado',
  reviewed: 'Marcar resuelto',
}

export function FeedbackRowActions({ id, currentStatus }: { id: string; currentStatus: string }) {
  const router = useRouter()
  const next = NEXT_STATUS[currentStatus]

  async function advance() {
    if (!next) return
    const supabase = createClient()
    const { error } = await supabase.from('user_feedback').update({ status: next }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    router.refresh()
  }

  if (!next) return <span className="text-xs text-muted-foreground">Resuelto</span>

  return (
    <Button variant="outline" size="sm" onClick={advance}>
      {ACTION_LABEL[currentStatus]}
    </Button>
  )
}

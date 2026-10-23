'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateFeedbackStatus } from '@/actions/feedback'

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
    const res = await updateFeedbackStatus(id, next)
    if (res.error) {
      toast.error(res.error)
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

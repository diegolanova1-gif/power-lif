'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { replyToFeedback } from '@/actions/feedback'

interface FeedbackReplyProps {
  feedbackId: string
  coachReply: string | null
  reviewedAt: string | null
}

// Inline coach answer to an athlete's exercise note (used in Seguimiento)
export function FeedbackReply({ feedbackId, coachReply, reviewedAt }: FeedbackReplyProps) {
  const [reply, setReply] = useState(coachReply ?? '')
  const [saved, setSaved] = useState(!!reviewedAt)
  const [saving, setSaving] = useState(false)

  async function send() {
    setSaving(true)
    const result = await replyToFeedback({ feedbackId, reply, markReviewed: true })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setSaved(true)
    toast.success(reply.trim() ? 'Respuesta enviada' : 'Marcado como visto')
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={reply}
        onChange={e => {
          setReply(e.target.value)
          setSaved(false)
        }}
        placeholder="Responder al alumno (opcional)..."
        rows={2}
        className="bg-white text-sm"
        maxLength={2000}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={send} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          {reply.trim() ? 'Responder' : 'Marcar como visto'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Visto
          </span>
        )}
      </div>
    </div>
  )
}

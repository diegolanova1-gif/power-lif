'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MediaGrid, type MediaItem } from '@/components/media-grid'
import { weekdayName } from '@/lib/weekdays'
import { replyToFeedback, deleteFeedbackMedia } from '@/actions/feedback'
import { FEEDBACK_REASONS, type FeedbackReason } from '@/lib/feedback-reason'

export interface ReviewItem {
  id: string
  athleteId: string
  athleteName: string
  exerciseName: string
  week: number
  day: number
  note: string | null
  reason: FeedbackReason | null
  coachReply: string | null
  reviewedAt: string | null
  updatedAt: string
  media: MediaItem[]
}

export function ReviewCard({ item }: { item: ReviewItem }) {
  const [reply, setReply] = useState(item.coachReply ?? '')
  const [saving, setSaving] = useState(false)
  const [media, setMedia] = useState(item.media)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function save(markReviewed: boolean) {
    setSaving(true)
    const result = await replyToFeedback({ feedbackId: item.id, reply, markReviewed })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(markReviewed ? 'Marcado como revisado' : 'Vuelve a pendientes')
  }

  async function removeMedia(m: MediaItem) {
    if (!confirm('¿Borrar este archivo? Libera espacio y no se puede recuperar.')) return
    setDeletingId(m.id)
    const result = await deleteFeedbackMedia(m.id)
    setDeletingId(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setMedia(prev => prev.filter(x => x.id !== m.id))
    toast.success('Archivo borrado')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link href={`/coach/athletes/${item.athleteId}?week=${item.week}&day=${item.day}`} className="font-semibold text-foreground hover:text-primary hover:underline">
              {item.athleteName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {item.exerciseName} · Semana {item.week}, {weekdayName(item.day)} ·{' '}
              {new Date(item.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {item.reviewedAt ? (
            <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Revisado</Badge>
          ) : (
            <Badge variant="warning">Pendiente</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.reason && <Badge variant="warning">{FEEDBACK_REASONS[item.reason]}</Badge>}
        {item.note && <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">{item.note}</p>}

        <MediaGrid items={media} onDelete={removeMedia} deletingId={deletingId} />

        <Textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Respuesta para el alumno (opcional): corrección técnica, ajuste de carga..."
          rows={2}
          className="text-sm"
          maxLength={2000}
        />
        <div className="flex flex-wrap gap-2">
          {item.reviewedAt ? (
            <>
              <Button size="sm" onClick={() => save(true)} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Guardar respuesta
              </Button>
              <Button size="sm" variant="outline" onClick={() => save(false)} disabled={saving}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Volver a pendiente
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => save(true)} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {reply.trim() ? 'Responder y marcar revisado' : 'Marcar revisado'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

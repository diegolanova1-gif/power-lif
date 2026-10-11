'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, ChevronDown, Loader2, Paperclip, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MediaGrid, type MediaItem } from '@/components/media-grid'
import { weekdayName } from '@/lib/weekdays'
import { formatDuration } from '@/lib/validations/routine'
import { replyToFeedback, deleteFeedbackMedia } from '@/actions/feedback'
import { FEEDBACK_REASONS, type FeedbackReason } from '@/lib/feedback-reason'
import { cn } from '@/lib/utils'

export interface ReviewItem {
  id: string
  athleteId: string
  athleteName: string
  exerciseName: string
  week: number
  day: number
  sets: { set_number: number; reps: number | null; duration_seconds: number | null; weight_kg: number; rpe: number | null }[]
  /** Lo pautado por el coach para este ejercicio, ej: "4 × 5 · 80 kg" */
  prescription: string | null
  /** Si hizo otro ejercicio en lugar del pautado */
  substitutedName: string | null
  note: string | null
  reason: FeedbackReason | null
  coachReply: string | null
  reviewedAt: string | null
  updatedAt: string
  media: MediaItem[]
}

export function ReviewCard({ item, defaultOpen = false }: { item: ReviewItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
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
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
      >
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-foreground">
          {item.athleteName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-medium text-foreground">{item.athleteName}</p>
            <span className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
              {formatDistanceToNowStrict(new Date(item.updatedAt), { locale: es, addSuffix: true })}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {item.exerciseName} · Semana {item.week}, {weekdayName(item.day)}
          </p>
          <p className="mt-0.5 truncate text-sm text-foreground/80">
            {item.sets.length > 0
              ? `Hizo ${item.sets.length} ${item.sets.length === 1 ? 'serie' : 'series'}`
              : 'Sin series registradas'}
            {item.prescription && <span className="text-muted-foreground"> · pautado {item.prescription}</span>}
          </p>
          {!open && item.note && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{item.note}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {item.reason && (
              <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                {FEEDBACK_REASONS[item.reason]}
              </span>
            )}
            {media.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                {media.length}
              </span>
            )}
            {item.reviewedAt && (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Revisado
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 bg-muted/30 px-4 py-4">
          <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-foreground">
                {item.substitutedName ?? item.exerciseName}
              </p>
              {item.prescription && (
                <p className="font-mono text-xs tabular-nums text-muted-foreground">Pautado: {item.prescription}</p>
              )}
            </div>
            {item.substitutedName && (
              <p className="text-sm text-muted-foreground">En lugar de {item.exerciseName}</p>
            )}
            {item.sets.length > 0 ? (
              <div className="mt-2 divide-y divide-border">
                {item.sets.map(set => (
                  <div key={set.set_number} className="flex items-baseline gap-3 py-1.5 text-sm">
                    <span className="w-14 shrink-0 text-muted-foreground">Serie {set.set_number}</span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {set.weight_kg > 0 ? `${set.weight_kg} kg` : 'Peso corporal'}
                      {' × '}
                      {set.duration_seconds ? formatDuration(set.duration_seconds) : set.reps}
                    </span>
                    {set.rpe !== null && (
                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">RPE {set.rpe}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No hay series registradas para este ejercicio.</p>
            )}
          </div>

          {item.note && <p className="whitespace-pre-wrap text-sm text-foreground">{item.note}</p>}

          <MediaGrid items={media} onDelete={removeMedia} deletingId={deletingId} />

          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Respuesta para el alumno (opcional): corrección técnica, ajuste de carga..."
            rows={2}
            className="bg-card text-sm"
            maxLength={2000}
          />
          <div className="flex flex-wrap items-center gap-2">
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
            <Link
              href={`/coach/athletes/${item.athleteId}?week=${item.week}&day=${item.day}`}
              className="ml-auto text-sm text-primary hover:underline"
            >
              Ver alumno
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MessageSquare, Paperclip, Send, Loader2, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MediaGrid, type MediaItem } from '@/components/media-grid'
import { createClient } from '@/lib/supabase/client'
import {
  MEDIA_BUCKET,
  MAX_MEDIA_BYTES,
  SIGNED_URL_TTL_SECONDS,
  buildMediaPath,
  formatBytes,
  getMediaType,
  signedUrlMap,
  type MediaType,
} from '@/lib/media'

interface ExerciseFeedbackProps {
  athleteId: string
  athleteRoutineId: string
  exerciseId: string
  week: number
  day: number
}

interface Feedback {
  id: string
  note: string | null
  coach_reply: string | null
  reviewed_at: string | null
}

export function ExerciseFeedback({ athleteId, athleteRoutineId, exerciseId, week, day }: ExerciseFeedbackProps) {
  const [supabase] = useState(() => createClient())
  const fileInput = useRef<HTMLInputElement>(null)

  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchFeedback = useCallback(async () => {
    const { data: fb } = await supabase
      .from('exercise_feedback')
      .select('id, note, coach_reply, reviewed_at')
      .eq('athlete_routine_id', athleteRoutineId)
      .eq('exercise_id', exerciseId)
      .eq('week', week)
      .eq('day', day)
      .maybeSingle()
    if (!fb) return { feedback: null, media: [] }

    const { data: allRows } = await supabase
      .from('exercise_media')
      .select('id, storage_path, media_type, deleted_at')
      .eq('feedback_id', fb.id)
      .order('created_at')
    const rows = allRows?.filter(r => !r.deleted_at)

    const paths = rows?.map(r => r.storage_path) ?? []
    const { data: signed } = paths.length
      ? await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
      : { data: [] }
    const urlByPath = signedUrlMap(signed)

    const media: MediaItem[] = (rows ?? []).map(r => ({
      id: r.id,
      storage_path: r.storage_path,
      media_type: r.media_type as MediaType,
      url: urlByPath.get(r.storage_path) ?? null,
    }))
    return { feedback: fb as Feedback, media }
  }, [supabase, athleteRoutineId, exerciseId, week, day])

  function applyFeedback({ feedback: fb, media: items }: Awaited<ReturnType<typeof fetchFeedback>>) {
    setFeedback(fb)
    setNote(fb?.note ?? '')
    setMedia(items)
    if (fb) setOpen(true)
  }

  useEffect(() => {
    let cancelled = false
    fetchFeedback().then(result => {
      if (!cancelled) applyFeedback(result)
    })
    return () => {
      cancelled = true
    }
  }, [fetchFeedback])

  function pickFiles(list: FileList | null) {
    const picked = Array.from(list ?? [])
    const valid = picked.filter(file => {
      if (!getMediaType(file)) {
        toast.error(`${file.name}: solo fotos o videos`)
        return false
      }
      if (file.size > MAX_MEDIA_BYTES) {
        toast.error(`${file.name} pesa ${formatBytes(file.size)}. Máximo ${formatBytes(MAX_MEDIA_BYTES)}: grábalo más corto o en menor calidad.`)
        return false
      }
      return true
    })
    setFiles(prev => [...prev, ...valid])
    if (fileInput.current) fileInput.current.value = ''
  }

  async function submit() {
    if (!note.trim() && files.length === 0) {
      toast.error('Escribe una observación o adjunta una foto/video')
      return
    }

    setProgress('Guardando...')
    try {
      // New content goes back to "pending" so the coach sees it again
      const { data: fb, error } = await supabase
        .from('exercise_feedback')
        .upsert(
          {
            athlete_id: athleteId,
            athlete_routine_id: athleteRoutineId,
            exercise_id: exerciseId,
            week,
            day,
            note: note.trim() || null,
            reviewed_at: null,
          },
          { onConflict: 'athlete_routine_id,exercise_id,week,day' }
        )
        .select('id')
        .single()
      if (error) throw error

      // Subir de nuevo reemplaza lo anterior de esta observación (no acumula)
      if (files.length > 0 && media.length > 0) {
        await supabase.storage.from(MEDIA_BUCKET).remove(media.map(m => m.storage_path))
        await supabase.from('exercise_media').delete().in('id', media.map(m => m.id))
      }

      for (const [i, file] of files.entries()) {
        setProgress(`Subiendo ${i + 1} de ${files.length}...`)
        const path = buildMediaPath(athleteId, fb.id, file)
        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(path, file, { contentType: file.type })
        if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`)

        const { error: rowError } = await supabase.from('exercise_media').insert({
          feedback_id: fb.id,
          athlete_id: athleteId,
          storage_path: path,
          media_type: getMediaType(file),
          size_bytes: file.size,
        })
        if (rowError) {
          await supabase.storage.from(MEDIA_BUCKET).remove([path])
          throw rowError
        }
      }

      toast.success('Enviado a tu coach')
      setFiles([])
      applyFeedback(await fetchFeedback())
    } catch (error) {
      console.error('Error in ExerciseFeedback submit:', error)
      toast.error(`No se pudo enviar: ${(error as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  async function deleteMedia(item: MediaItem) {
    setDeletingId(item.id)
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([item.storage_path])
    const { error: rowError } = error ? { error } : await supabase.from('exercise_media').delete().eq('id', item.id)
    setDeletingId(null)

    if (error || rowError) {
      toast.error('No se pudo eliminar el archivo')
      return
    }
    setMedia(prev => prev.filter(m => m.id !== item.id))
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="mt-3 text-gray-500" onClick={() => setOpen(true)}>
        <MessageSquare className="mr-1 h-4 w-4" />
        Agregar observación o video
      </Button>
    )
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-sm font-medium text-gray-700">
          <MessageSquare className="h-4 w-4" />
          Observaciones para tu coach
        </p>
        {feedback?.reviewed_at && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Revisado
          </span>
        )}
      </div>

      {feedback?.coach_reply && (
        <div className="rounded-md border-l-4 border-primary bg-white p-2 text-sm">
          <p className="text-xs font-medium text-gray-500">Tu coach:</p>
          <p className="whitespace-pre-wrap text-gray-800">{feedback.coach_reply}</p>
        </div>
      )}

      <MediaGrid items={media} onDelete={deleteMedia} deletingId={deletingId} />

      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="¿Cómo se sintió? Dolor, técnica, dudas..."
        rows={2}
        className="bg-white text-sm"
        maxLength={2000}
      />

      {files.length > 0 && (
        <ul className="space-y-1 text-sm">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between rounded bg-white px-2 py-1">
              <span className="truncate">{file.name} <span className="text-gray-400">({formatBytes(file.size)})</span></span>
              <button
                type="button"
                onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-red-600"
                aria-label={`Quitar ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => pickFiles(e.target.files)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={!!progress}>
          <Paperclip className="mr-1 h-4 w-4" />
          Foto / video
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={!!progress}>
          {progress ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          {progress ?? 'Enviar a mi coach'}
        </Button>
        <span className="text-xs text-gray-400">Máx. {formatBytes(MAX_MEDIA_BYTES)} por archivo</span>
      </div>
    </div>
  )
}

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET } from '@/lib/media'

const replySchema = z.object({
  feedbackId: z.string().uuid(),
  reply: z.string().trim().max(2000),
  markReviewed: z.boolean(),
})

// RLS (exercise_feedback_coach_update) limits this to the coach's own athletes
export async function replyToFeedback(input: z.infer<typeof replySchema>) {
  const validation = replySchema.safeParse(input)
  if (!validation.success) return { error: validation.error.issues[0].message }
  const { feedbackId, reply, markReviewed } = validation.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('exercise_feedback')
    .update({
      coach_reply: reply || null,
      reviewed_at: markReviewed ? new Date().toISOString() : null,
    })
    .eq('id', feedbackId)
    .select('id')

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'Observación no encontrada o sin permisos' }

  revalidatePath('/coach/reviews')
  revalidatePath('/coach', 'layout')
  return { success: true }
}

// Coach frees storage by deleting media already reviewed
export async function deleteFeedbackMedia(mediaId: string) {
  if (!z.string().uuid().safeParse(mediaId).success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: media } = await supabase
    .from('exercise_media')
    .select('id, storage_path')
    .eq('id', mediaId)
    .maybeSingle()
  if (!media) return { error: 'Archivo no encontrado o sin permisos' }

  const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path])
  if (storageError) return { error: `No se pudo borrar el archivo: ${storageError.message}` }

  const { error } = await supabase.from('exercise_media').delete().eq('id', mediaId)
  if (error) return { error: error.message }

  revalidatePath('/coach/reviews')
  return { success: true }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUserId } from '@/lib/auth/admin'

const FEEDBACK_TYPES = ['suggestion', 'bug', 'feature', 'error', 'other'] as const

export async function updateFeedbackStatus(id: string, status: string) {
  const adminId = await getAdminUserId()
  if (!adminId) return { error: 'No autorizado' }
  if (!['reviewed', 'resolved'].includes(status)) return { error: 'Estado inválido' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_feedback')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/feedback')
  return { success: true }
}

export async function submitUserFeedback(type: string, message: string) {
  if (!FEEDBACK_TYPES.includes(type as any) || !message.trim()) {
    return { error: 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('submit_user_feedback', {
    p_user_id: user.id,
    p_type: type,
    p_message: message.trim(),
  })

  if (error) return { error: error.message }
  return { success: true }
}

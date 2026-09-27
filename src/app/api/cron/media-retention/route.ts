import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MEDIA_BUCKET } from '@/lib/media'

const RETENTION_DAYS = 14

// Vercel Cron (daily): purges storage files whose observation was already
// reviewed by the coach, or that are older than RETENTION_DAYS. The DB row
// stays (deleted_at set) so history and the coach's comment thread survive.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates, error } = await admin
    .from('exercise_media')
    .select('id, storage_path, created_at, feedback:exercise_feedback(reviewed_at)')
    .is('deleted_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const toPurge = (candidates ?? []).filter(m => {
    const reviewed = (m.feedback as unknown as { reviewed_at: string | null } | null)?.reviewed_at
    return !!reviewed || m.created_at < cutoff
  })
  if (toPurge.length === 0) return NextResponse.json({ purged: 0 })

  const { error: removeError } = await admin.storage.from(MEDIA_BUCKET).remove(toPurge.map(m => m.storage_path))
  if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 })

  const { error: updateError } = await admin
    .from('exercise_media')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', toPurge.map(m => m.id))
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ purged: toPurge.length })
}

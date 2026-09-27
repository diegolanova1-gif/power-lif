import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import { ReviewCard, type ReviewItem } from '@/components/coach/review-card'
import { MEDIA_BUCKET, SIGNED_URL_TTL_SECONDS, signedUrlMap, type MediaType } from '@/lib/media'
import { cn } from '@/lib/utils'

const TABS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'reviewed', label: 'Revisadas' },
] as const

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status === 'reviewed' ? 'reviewed' : 'pending'
  const supabase = await createClient()

  // RLS returns only feedback from this coach's athletes
  let query = supabase
    .from('exercise_feedback')
    .select(`
      id, athlete_id, week, day, note, reason, coach_reply, reviewed_at, updated_at,
      exercise:exercises(name),
      athlete:profiles!exercise_feedback_athlete_id_fkey(full_name),
      media:exercise_media(id, storage_path, media_type, created_at, deleted_at)
    `)
    .order('updated_at', { ascending: false })
    .limit(50)

  query = status === 'pending' ? query.is('reviewed_at', null) : query.not('reviewed_at', 'is', null)
  const { data: rawRows, error } = await query
  const rows = rawRows?.map(r => ({
    ...r,
    media: (r.media as { id: string; storage_path: string; media_type: MediaType; created_at: string; deleted_at: string | null }[]).filter(m => !m.deleted_at),
  }))

  const paths = rows?.flatMap(r => r.media.map(m => m.storage_path)) ?? []
  const { data: signed } = paths.length
    ? await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: [] }
  const urlByPath = signedUrlMap(signed)

  const items: ReviewItem[] = (rows ?? []).map(r => {
    const exercise = r.exercise as unknown as { name: string } | null
    const athlete = r.athlete as unknown as { full_name: string | null } | null
    const media = r.media
    return {
      id: r.id,
      athleteId: r.athlete_id,
      athleteName: athlete?.full_name || 'Alumno',
      exerciseName: exercise?.name || 'Ejercicio',
      week: r.week,
      day: r.day,
      note: r.note,
      reason: r.reason,
      coachReply: r.coach_reply,
      reviewedAt: r.reviewed_at,
      updatedAt: r.updated_at,
      media: [...media]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(m => ({ id: m.id, storage_path: m.storage_path, media_type: m.media_type, url: urlByPath.get(m.storage_path) ?? null })),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revisiones</h1>
        <p className="text-gray-500 mt-1">Observaciones, fotos y videos que te mandan tus alumnos</p>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value === 'pending' ? '/coach/reviews' : '/coach/reviews?status=reviewed'}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              status === tab.value ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-600">{error.message}</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">
              {status === 'pending' ? 'No tienes revisiones pendientes' : 'Todavía no revisaste nada'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <ReviewCard key={`${item.id}-${item.reviewedAt}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, MessageSquare } from 'lucide-react'
import { ReviewCard, type ReviewItem } from '@/components/coach/review-card'
import { MEDIA_BUCKET, SIGNED_URL_TTL_SECONDS, signedUrlMap, type MediaType } from '@/lib/media'
import { cn } from '@/lib/utils'
import { formatDuration, formatReps, scheduleForWeek, type RoutineStructure } from '@/lib/validations/routine'

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
      id, athlete_id, athlete_routine_id, exercise_id, week, day, note, reason, coach_reply, reviewed_at, updated_at,
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

  // Lo que el alumno realmente registró en cada ejercicio revisado + lo pautado
  const routineIds = [...new Set((rows ?? []).map(r => r.athlete_routine_id as string).filter(Boolean))]
  const exerciseIds = [...new Set((rows ?? []).map(r => r.exercise_id as string).filter(Boolean))]
  const [{ data: loggedSets }, { data: routineRows }] = routineIds.length
    ? await Promise.all([
        supabase
          .from('sets_log')
          .select('athlete_routine_id, exercise_id, week, day, set_number, reps, duration_seconds, weight_kg, rpe, substituted_exercise_id')
          .in('athlete_routine_id', routineIds)
          .in('exercise_id', exerciseIds)
          .order('set_number', { ascending: true }),
        supabase.from('athlete_routines').select('id, routine:routines(structure)').in('id', routineIds),
      ])
    : [{ data: [] }, { data: [] }]

  const substituteIds = [...new Set((loggedSets ?? []).map(s => s.substituted_exercise_id).filter((id): id is string => !!id))]
  const { data: substitutes } = substituteIds.length
    ? await supabase.from('exercises').select('id, name').in('id', substituteIds)
    : { data: [] }
  const substituteName = new Map((substitutes ?? []).map(e => [e.id as string, e.name as string]))
  const structureByRoutine = new Map(
    (routineRows ?? []).map(r => [r.id as string, (r.routine as unknown as { structure: RoutineStructure } | null)?.structure ?? null])
  )

  function prescriptionFor(routineId: string, exerciseId: string, week: number, day: number): string | null {
    const structure = structureByRoutine.get(routineId)
    if (!structure?.schedule) return null
    const ex = scheduleForWeek(structure, week).find(d => d.day === day)?.exercises.find(e => e.exercise_id === exerciseId)
    if (!ex) return null
    const volume = ex.duration_seconds !== undefined ? formatDuration(ex.duration_seconds) : formatReps(ex)
    const load =
      ex.load_type === 'kg' && ex.load_value !== undefined
        ? `${ex.load_value} kg`
        : ex.load_type === 'percent' && ex.load_value !== undefined
          ? `${ex.load_value}% RM`
          : null
    return [`${ex.sets} × ${volume}`, load].filter(Boolean).join(' · ')
  }

  const items: ReviewItem[] = (rows ?? []).map(r => {
    const sets = (loggedSets ?? [])
      .filter(s => s.athlete_routine_id === r.athlete_routine_id && s.exercise_id === r.exercise_id && s.week === r.week && s.day === r.day)
      .map(s => ({
        set_number: s.set_number as number,
        reps: s.reps as number | null,
        duration_seconds: s.duration_seconds as number | null,
        weight_kg: Number(s.weight_kg),
        rpe: s.rpe as number | null,
      }))
    const substituteId = (loggedSets ?? []).find(
      s => s.athlete_routine_id === r.athlete_routine_id && s.exercise_id === r.exercise_id && s.week === r.week && s.day === r.day && s.substituted_exercise_id
    )?.substituted_exercise_id as string | undefined
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
      sets,
      prescription: prescriptionFor(r.athlete_routine_id as string, r.exercise_id as string, r.week, r.day),
      substitutedName: substituteId ? (substituteName.get(substituteId) ?? null) : null,
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Revisiones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === 'pending'
            ? items.length > 0
              ? `${items.length} por revisar`
              : 'Todo al día'
            : 'Lo que ya respondiste'}
        </p>
      </div>

      <div className="inline-flex w-fit rounded-lg bg-muted p-1">
        {TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value === 'pending' ? '/coach/reviews' : '/coach/reviews?status=reviewed'}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              status === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl bg-card px-6 py-12 text-center text-destructive ring-1 ring-foreground/10">{error.message}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-foreground/10">
          {status === 'pending' ? (
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
          ) : (
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          )}
          <p className="font-medium text-foreground">
            {status === 'pending' ? 'Bandeja vacía' : 'Todavía no revisaste nada'}
          </p>
          {status === 'pending' && (
            <p className="mt-1 text-sm text-muted-foreground">Cuando un alumno te mande algo, lo vas a ver acá.</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {items.map((item, i) => (
            <ReviewCard key={`${item.id}-${item.reviewedAt}`} item={item} defaultOpen={status === 'pending' && i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

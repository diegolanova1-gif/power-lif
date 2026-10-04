import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BarChart, CheckCircle2, AlertTriangle, Circle, MessageSquare, Pencil, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MediaGrid } from '@/components/media-grid'
import { FeedbackReply } from '@/components/coach/feedback-reply'
import { exerciseCompliance, sessionCompliance, type ComplianceStatus } from '@/lib/calculations/compliance'
import { formatReps, scheduleForWeek, type RoutineStructure } from '@/lib/validations/routine'
import { MEDIA_BUCKET, SIGNED_URL_TTL_SECONDS, signedUrlMap, type MediaType } from '@/lib/media'
import { FEEDBACK_REASONS } from '@/lib/feedback-reason'
import { Badge } from '@/components/ui/badge'
import { weekdayName, weekdayShort } from '@/lib/weekdays'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { dateForWeekDay, isToday as isTodayDate } from '@/lib/schedule-dates'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const STATUS_STYLE: Record<ComplianceStatus, { label: string; className: string }> = {
  done: { label: 'Hecho', className: 'bg-success text-success-foreground border-success' },
  partial: { label: 'Parcial', className: 'bg-warning text-warning-foreground border-warning' },
  none: { label: 'Sin registrar', className: 'bg-card text-muted-foreground border-border' },
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  if (status === 'done') return <span className="flex items-center gap-1 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Hecho</span>
  if (status === 'partial') return <span className="flex items-center gap-1 text-sm font-medium text-warning-foreground"><AlertTriangle className="h-4 w-4" /> Parcial</span>
  return <span className="flex items-center gap-1 text-sm text-muted-foreground"><Circle className="h-4 w-4" /> Sin registrar</span>
}

export default async function AthleteFollowUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string; day?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: link } = await supabase
    .from('coach_athletes')
    .select('profiles:athlete_id(id, full_name, email)')
    .eq('coach_id', user?.id ?? '')
    .eq('athlete_id', id)
    .maybeSingle()
  const athlete = link?.profiles as unknown as { id: string; full_name: string | null; email: string | null } | null
  if (!athlete) notFound()

  // Active program, or the most recent one
  const { data: assignment } = await supabase
    .from('athlete_routines')
    .select('id, status, current_week, current_day, started_at, routine_id, routine:routines(name, structure)')
    .eq('athlete_id', id)
    .order('status', { ascending: true }) // 'active' sorts first
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link href="/coach/athletes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{athlete.full_name || 'Alumno'}</h1>
          <p className="text-muted-foreground mt-1">Seguimiento: lo que indicaste y lo que hizo</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" nativeButton={false} render={<Link href={`/coach/analytics?athlete=${id}`} />}>
          <BarChart className="mr-2 h-4 w-4" />
          Estadísticas
        </Button>
        {assignment && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/coach/routines/${assignment.routine_id}/edit`} />}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar rutina
          </Button>
        )}
        <Button nativeButton={false} render={<Link href={`/coach/routines/new?athlete=${id}`} />}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva rutina
        </Button>
      </div>
    </div>
  )

  const routine = assignment?.routine as unknown as { name: string; structure: RoutineStructure } | null
  if (!assignment || !routine) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Todavía no tiene rutina asignada.</CardContent>
        </Card>
      </div>
    )
  }

  const structure = routine.structure
  const totalWeeks = structure.weeks || 1
  const trainingDays = [...structure.schedule].map(d => d.day).sort((a, b) => a - b)

  const [{ data: sets }, { data: feedback }] = await Promise.all([
    supabase
      .from('sets_log')
      .select('week, day, exercise_id, set_number, reps, weight_kg, rpe, completed_at')
      .eq('athlete_routine_id', assignment.id),
    supabase
      .from('exercise_feedback')
      .select('id, week, day, exercise_id, note, reason, coach_reply, reviewed_at, media:exercise_media(id, storage_path, media_type, created_at, deleted_at)')
      .eq('athlete_routine_id', assignment.id),
  ])
  const feedbackRows = feedback?.map(f => ({ ...f, media: f.media.filter(m => !m.deleted_at) }))

  // Real date the athlete actually logged each session (earliest set for that
  // week/day), falling back to the theoretical schedule date for sessions
  // that haven't happened yet — the athlete may train a day's content on a
  // different real calendar day than the one originally pautado.
  const realDateByDay = new Map<string, Date>()
  for (const s of sets ?? []) {
    const key = `${s.week}-${s.day}`
    const existing = realDateByDay.get(key)
    const completed = new Date(s.completed_at)
    if (!existing || completed < existing) realDateByDay.set(key, completed)
  }
  const dateFor = (w: number, d: number) => realDateByDay.get(`${w}-${d}`) ?? dateForWeekDay(assignment.started_at, w, d)
  const isToday = (w: number, d: number) => isTodayDate(dateFor(w, d))

  const setsFor = (week: number, day: number, exerciseId: string) =>
    (sets ?? [])
      .filter(s => s.week === week && s.day === day && s.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number)

  const statusOf = (week: number, day: number): ComplianceStatus => {
    const plan = scheduleForWeek(structure, week).find(d => d.day === day)
    if (!plan) return 'none'
    return sessionCompliance(plan.exercises.map(e => exerciseCompliance(e, setsFor(week, day, e.exercise_id))))
  }

  // Selected session: from the URL, else where the athlete is now
  const week = Math.min(Math.max(Number(query.week) || assignment.current_week || 1, 1), totalWeeks)
  const day = trainingDays.includes(Number(query.day)) ? Number(query.day) : trainingDays.includes(assignment.current_day) ? assignment.current_day : trainingDays[0]
  const plan = scheduleForWeek(structure, week).find(d => d.day === day)

  const exerciseIds = [...new Set(plan?.exercises.map(e => e.exercise_id) ?? [])]
  const { data: exercises } = exerciseIds.length
    ? await supabase.from('exercises').select('id, name').in('id', exerciseIds)
    : { data: [] }
  const nameById = new Map((exercises ?? []).map(e => [e.id, e.name as string]))

  const sessionFeedback = (feedbackRows ?? []).filter(f => f.week === week && f.day === day)
  const mediaPaths = sessionFeedback.flatMap(f => (f.media as unknown as { storage_path: string }[]).map(m => m.storage_path))
  const { data: signed } = mediaPaths.length
    ? await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(mediaPaths, SIGNED_URL_TTL_SECONDS)
    : { data: [] }
  const urlByPath = signedUrlMap(signed)

  // Sessions already due: before the athlete's current position, plus the current one once they logged something
  const isBeforeCurrent = (w: number, d: number) =>
    assignment.status === 'completed' || w < assignment.current_week || (w === assignment.current_week && d < assignment.current_day)
  const pastSessions = Array.from({ length: totalWeeks }, (_, i) => i + 1)
    .flatMap(w => trainingDays.map(d => ({ w, d, status: statusOf(w, d) })))
    .filter(({ w, d, status }) => isBeforeCurrent(w, d) || status !== 'none')
    .map(s => s.status)
  const doneSessions = pastSessions.filter(s => s === 'done').length
  const partialSessions = pastSessions.filter(s => s === 'partial').length

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Rutina</p>
            <p className="font-semibold text-foreground">{routine.name}</p>
            <p className="text-sm font-mono tabular-nums text-muted-foreground">
              {assignment.status === 'completed' ? 'Terminada' : `Va por semana ${assignment.current_week}, ${weekdayName(assignment.current_day)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sesiones cumplidas</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums text-success">{doneSessions} <span className="text-base font-normal text-muted-foreground">de {pastSessions.length}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sesiones parciales</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums text-warning-foreground">{partialSessions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Week × day grid */}
      <Card>
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 overflow-x-auto">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
            <div key={w} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-sm text-muted-foreground">
                Semana {w}
                <span className="ml-1 text-xs font-mono tabular-nums text-muted-foreground/80">
                  ({format(dateFor(w, trainingDays[0]), 'd MMM', { locale: es })})
                </span>
              </span>
              {trainingDays.map(d => {
                const status = statusOf(w, d)
                const selected = w === week && d === day
                const todayCell = isToday(w, d)
                const hasNote = (feedback ?? []).some(f => f.week === w && f.day === d)
                return (
                  <Link
                    key={d}
                    href={`/coach/athletes/${id}?week=${w}&day=${d}`}
                    scroll={false}
                    title={`${realDateByDay.has(`${w}-${d}`) ? capitalize(format(dateFor(w, d), 'EEEE', { locale: es })) : weekdayName(d)} ${format(dateFor(w, d), 'd MMM', { locale: es })} · ${STATUS_STYLE[status].label}${todayCell ? ' · Hoy' : ''}`}
                    className={cn(
                      'relative flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border text-xs font-medium leading-none',
                      STATUS_STYLE[status].className,
                      selected && 'ring-2 ring-primary ring-offset-2',
                      todayCell && !selected && 'ring-2 ring-primary/40 ring-offset-1'
                    )}
                  >
                    <span>{realDateByDay.has(`${w}-${d}`) ? capitalize(format(dateFor(w, d), 'EEEEEE', { locale: es })) : weekdayShort(d)}</span>
                    <span className="text-[10px] font-mono font-normal tabular-nums opacity-70">{format(dateFor(w, d), 'd')}</span>
                    {hasNote && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-foreground" />}
                    {todayCell && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />}
                  </Link>
                )
              })}
            </div>
          ))}
          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-success" /> Hecho</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-warning" /> Parcial</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-border" /> Sin registrar</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-accent-foreground" /> Dejó comentario</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Hoy</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected session */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Semana {week} · {realDateByDay.has(`${week}-${day}`)
              ? capitalize(format(dateFor(week, day), 'EEEE', { locale: es }))
              : weekdayName(day)}
            {plan?.name && plan.name !== weekdayName(day) && <span className="font-normal text-muted-foreground"> · {plan.name}</span>}
          </h2>
          <StatusBadge status={statusOf(week, day)} />
        </div>

        {plan?.exercises.map((ex, i) => {
          const done = setsFor(week, day, ex.exercise_id)
          const status = exerciseCompliance(ex, done)
          const fb = sessionFeedback.find(f => f.exercise_id === ex.exercise_id)
          const media = ((fb?.media as unknown as { id: string; storage_path: string; media_type: MediaType; created_at: string }[]) ?? [])
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map(m => ({ id: m.id, storage_path: m.storage_path, media_type: m.media_type, url: urlByPath.get(m.storage_path) ?? null }))
          return (
            <Card key={`${ex.exercise_id}-${i}`} className={cn(status === 'done' && 'border-success/40', status === 'partial' && 'border-warning/50')}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{nameById.get(ex.exercise_id) ?? 'Ejercicio'}</CardTitle>
                  <StatusBadge status={status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Indicado</p>
                    <p className="text-sm text-foreground">
                      <span className="font-mono tabular-nums">{ex.sets}</span> series × <span className="font-mono tabular-nums">{formatReps(ex)}</span> reps
                      {ex.intensity ? ` · ${ex.intensity}` : ''}
                      {ex.rpe_target ? ` · esfuerzo ${ex.rpe_target}/10` : ''}
                    </p>
                    {ex.note && <p className="mt-1 text-sm text-accent-foreground">{ex.note}</p>}
                  </div>
                  <div className={cn('rounded-lg p-3', status === 'done' ? 'bg-success/10' : status === 'partial' ? 'bg-warning/20' : 'bg-muted/60')}>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Hizo</p>
                    {done.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Todavía no registró</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {done.map(s => (
                          <span key={s.set_number} className="rounded border border-border bg-card px-1.5 py-0.5 text-sm font-mono tabular-nums">
                            {s.reps} × {Number(s.weight_kg) > 0 ? `${s.weight_kg} kg` : 'p. corporal'}
                          </span>
                        ))}
                        {done[0]?.rpe && <span className="text-sm text-muted-foreground">· esfuerzo {done[0].rpe}/10</span>}
                      </div>
                    )}
                  </div>
                </div>

                {fb && (
                  <div className="space-y-2 rounded-lg border border-accent bg-accent/50 p-3">
                    <p className="flex items-center gap-1 text-xs font-medium uppercase text-accent-foreground">
                      <MessageSquare className="h-3.5 w-3.5" /> Comentario del alumno
                    </p>
                    {fb.reason && <Badge variant="warning">{FEEDBACK_REASONS[fb.reason as keyof typeof FEEDBACK_REASONS]}</Badge>}
                    {fb.note && <p className="whitespace-pre-wrap text-sm text-foreground">{fb.note}</p>}
                    <MediaGrid items={media} />
                    <FeedbackReply feedbackId={fb.id} coachReply={fb.coach_reply} reviewedAt={fb.reviewed_at} />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

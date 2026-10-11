import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertTriangle, ChevronDown, Circle, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MediaGrid } from '@/components/media-grid'
import { FeedbackReply } from '@/components/coach/feedback-reply'
import { exerciseCompliance, sessionCompliance, type ComplianceStatus } from '@/lib/calculations/compliance'
import { formatReps, formatDuration, scheduleForWeek, type RoutineStructure } from '@/lib/validations/routine'
import { MEDIA_BUCKET, SIGNED_URL_TTL_SECONDS, signedUrlMap, type MediaType } from '@/lib/media'
import { FEEDBACK_REASONS } from '@/lib/feedback-reason'
import { Badge } from '@/components/ui/badge'
import { weekdayName, weekdayShort } from '@/lib/weekdays'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { dateForWeekDay, isToday as isTodayDate } from '@/lib/schedule-dates'
import { getStreakAndAchievements } from '@/lib/server/achievements'
import { StreakAchievements } from '@/components/athlete/streak-achievements'
import { AthleteActions } from '@/components/coach/athlete-actions'

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

  const routine = assignment?.routine as unknown as { name: string; structure: RoutineStructure } | null

  const header = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Link href="/coach/athletes" className="mt-1.5 text-muted-foreground hover:text-foreground" aria-label="Volver a alumnos">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">{athlete.full_name || 'Alumno'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignment && routine
              ? `${routine.name} · ${assignment.status === 'completed' ? 'terminada' : `va por la semana ${assignment.current_week}, ${weekdayName(assignment.current_day)}`}`
              : 'Sin rutina asignada'}
          </p>
        </div>
      </div>
      <AthleteActions athleteId={id} athleteName={athlete.full_name} routineId={assignment?.routine_id ?? null} />
    </div>
  )

  if (!assignment || !routine) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="rounded-2xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
          Todavía no tiene rutina asignada.
        </div>
      </div>
    )
  }

  const structure = routine.structure
  const totalWeeks = structure.weeks || 1
  const trainingDays = [...structure.schedule].map(d => d.day).sort((a, b) => a - b)

  const [{ data: sets }, { data: feedback }] = await Promise.all([
    supabase
      .from('sets_log')
      .select('week, day, exercise_id, set_number, reps, duration_seconds, weight_kg, rpe, completed_at, substituted_exercise_id')
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

  // Reemplazos ("hizo otro ejercicio en vez de este") pueden apuntar fuera del catálogo de la sesión
  const substituteIds = [...new Set((sets ?? []).map(s => s.substituted_exercise_id).filter((id): id is string => !!id && !nameById.has(id)))]
  if (substituteIds.length) {
    const { data: substitutes } = await supabase.from('exercises').select('id, name').in('id', substituteIds)
    substitutes?.forEach(e => nameById.set(e.id, e.name))
  }

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

  // Read-only here: only the athlete's own session can unlock a new
  // achievement (RLS), so a coach just sees whatever is already earned.
  const { streak, currentWeekDays, currentWeekRequired, unlockedCards, unlockedDates } = await getStreakAndAchievements(supabase, id, structure, false)

  // Historial completo: todas las sesiones registradas de esta rutina, más reciente primero
  const loggedIds = [...new Set((sets ?? []).map(s => s.exercise_id as string))].filter(id => !nameById.has(id))
  if (loggedIds.length) {
    const { data: more } = await supabase.from('exercises').select('id, name').in('id', loggedIds)
    more?.forEach(e => nameById.set(e.id, e.name as string))
  }
  type HistSet = { set_number: number; reps: number | null; duration_seconds: number | null; weight_kg: number; rpe: number | null }
  const historyMap = new Map<string, { week: number; day: number; date: Date; exercises: Map<string, HistSet[]> }>()
  for (const s of sets ?? []) {
    const key = `${s.week}-${s.day}`
    let h = historyMap.get(key)
    if (!h) {
      h = { week: s.week, day: s.day, date: realDateByDay.get(key) ?? new Date(s.completed_at), exercises: new Map() }
      historyMap.set(key, h)
    }
    const list = h.exercises.get(s.exercise_id) ?? []
    list.push({ set_number: s.set_number, reps: s.reps, duration_seconds: s.duration_seconds, weight_kg: Number(s.weight_kg), rpe: s.rpe })
    h.exercises.set(s.exercise_id, list)
  }
  const history = [...historyMap.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
  const historyGroups: { label: string; items: typeof history }[] = []
  for (const h of history) {
    const label = capitalize(format(h.date, 'MMMM yyyy', { locale: es }))
    const last = historyGroups.at(-1)
    if (last && last.label === label) last.items.push(h)
    else historyGroups.push({ label, items: [h] })
  }

  return (
    <div className="flex flex-col gap-8">
      {header}

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium text-muted-foreground">Cumplidas</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {doneSessions}
            <span className="ml-1 text-base font-normal text-muted-foreground">de {pastSessions.length}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium text-muted-foreground">Parciales</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">{partialSessions}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium text-muted-foreground">Racha</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {streak}
            <span className="ml-1 text-base font-normal text-muted-foreground">{streak === 1 ? 'día' : 'días'}</span>
          </p>
        </div>
      </section>

      {/* Week x day grid */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Calendario</h2>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex max-w-xl flex-col gap-2.5">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
              <div key={w} className="grid items-center gap-2" style={{ gridTemplateColumns: `4rem repeat(${trainingDays.length}, minmax(0, 1fr))` }}>
                <span className="text-sm leading-tight text-muted-foreground">
                  Sem {w}
                  <span className="block font-mono text-[11px] tabular-nums text-muted-foreground/80">
                    {format(dateFor(w, trainingDays[0]), 'd MMM', { locale: es })}
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
                        'relative flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium leading-none',
                        STATUS_STYLE[status].className,
                        selected && 'ring-2 ring-primary ring-offset-2',
                        todayCell && !selected && 'ring-2 ring-primary/40 ring-offset-1'
                      )}
                    >
                      <span>{realDateByDay.has(`${w}-${d}`) ? capitalize(format(dateFor(w, d), 'EEEEEE', { locale: es })) : weekdayShort(d)}</span>
                      <span className="font-mono text-[10px] font-normal tabular-nums opacity-70">{format(dateFor(w, d), 'd')}</span>
                      {hasNote && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-foreground" />}
                      {todayCell && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-success" /> Hecho</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-warning" /> Parcial</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-border" /> Sin registrar</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-accent-foreground" /> Dejó comentario</span>
          </div>
        </div>
      </section>

      {/* Selected session */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-lg font-semibold text-foreground">
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
            <div
              key={`${ex.exercise_id}-${i}`}
              className={cn(
                'rounded-2xl bg-card p-4 ring-1',
                status === 'done' ? 'ring-success/40' : status === 'partial' ? 'ring-warning/50' : 'ring-foreground/10'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-foreground">{nameById.get(ex.exercise_id) ?? 'Ejercicio'}</p>
                <StatusBadge status={status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Indicado:{' '}
                <span className="font-mono tabular-nums text-foreground">
                  {ex.sets} × {ex.duration_seconds !== undefined ? formatDuration(ex.duration_seconds) : formatReps(ex)}
                  {ex.intensity ? ` · ${ex.intensity}` : ''}
                  {ex.rpe_target ? ` · esfuerzo ${ex.rpe_target}/10` : ''}
                </span>
              </p>
              {ex.note && <p className="mt-1 text-sm text-accent-foreground">{ex.note}</p>}

              <div className={cn('mt-3 rounded-xl p-3', status === 'done' ? 'bg-success/10' : status === 'partial' ? 'bg-warning/15' : 'bg-muted/60')}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Hizo</p>
                {done.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no registró</p>
                ) : (
                  <div>
                    {done[0]?.substituted_exercise_id && (
                      <p className="mb-1 text-sm text-muted-foreground">
                        Cambió por <span className="font-medium text-foreground">{nameById.get(done[0].substituted_exercise_id) ?? 'otro ejercicio'}</span>
                      </p>
                    )}
                    <div className="divide-y divide-border/60">
                      {done.map(s => (
                        <div key={s.set_number} className="flex items-baseline gap-3 py-1.5 text-sm">
                          <span className="w-14 shrink-0 text-muted-foreground">Serie {s.set_number}</span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {Number(s.weight_kg) > 0 ? `${s.weight_kg} kg` : 'Peso corporal'}
                            {' × '}
                            {s.duration_seconds ? formatDuration(s.duration_seconds) : s.reps}
                          </span>
                          {s.rpe ? <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">RPE {s.rpe}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {fb && (
                <div className="mt-3 space-y-2 rounded-xl border border-accent bg-accent/50 p-3">
                  <p className="flex items-center gap-1 text-xs font-medium uppercase text-accent-foreground">
                    <MessageSquare className="h-3.5 w-3.5" /> Comentario del alumno
                  </p>
                  {fb.reason && <Badge variant="warning">{FEEDBACK_REASONS[fb.reason as keyof typeof FEEDBACK_REASONS]}</Badge>}
                  {fb.note && <p className="whitespace-pre-wrap text-sm text-foreground">{fb.note}</p>}
                  <MediaGrid items={media} />
                  <FeedbackReply feedbackId={fb.id} coachReply={fb.coach_reply} reviewedAt={fb.reviewed_at} />
                </div>
              )}
            </div>
          )
        })}
      </section>

      {history.length > 0 ? (
        <section id="historial" className="flex scroll-mt-20 flex-col gap-3">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            Historial <span className="font-mono tabular-nums">· {history.length} {history.length === 1 ? 'sesión' : 'sesiones'}</span>
          </h2>
          {historyGroups.map(group => (
            <div key={group.label} className="flex flex-col gap-2">
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
                {group.items.map(h => {
                  const all = [...h.exercises.values()].flat()
                  const volume = all.reduce((sum, st) => sum + (st.reps !== null ? st.weight_kg * st.reps : 0), 0)
                  return (
                    <details key={`${h.week}-${h.day}`} className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50">
                        <div className="w-10 shrink-0 text-center">
                          <p className="font-mono text-xl font-semibold leading-none tabular-nums text-foreground">{format(h.date, 'd')}</p>
                          <p className="mt-1 text-xs uppercase text-muted-foreground">{format(h.date, 'EEE', { locale: es })}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">Semana {h.week} · {weekdayName(h.day)}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {h.exercises.size} ejercicios · {all.length} series · {volume.toLocaleString('es-AR')} kg
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="flex flex-col gap-4 bg-muted/30 px-4 py-4">
                        {[...h.exercises.entries()].map(([exerciseId, exSets]) => (
                          <div key={exerciseId}>
                            <p className="mb-1 font-medium text-foreground">{nameById.get(exerciseId) ?? 'Ejercicio'}</p>
                            <div className="divide-y divide-border">
                              {[...exSets].sort((a, b) => a.set_number - b.set_number).map(st => (
                                <div key={st.set_number} className="flex items-baseline gap-3 py-1.5 text-sm">
                                  <span className="w-14 shrink-0 text-muted-foreground">Serie {st.set_number}</span>
                                  <span className="font-mono font-medium tabular-nums text-foreground">
                                    {st.weight_kg > 0 ? `${st.weight_kg} kg` : 'Peso corporal'}
                                    {' × '}
                                    {st.duration_seconds ? formatDuration(st.duration_seconds) : st.reps}
                                  </span>
                                  {st.rpe ? <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">RPE {st.rpe}</span> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section id="historial" className="flex scroll-mt-20 flex-col gap-3">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">Historial</h2>
          <div className="rounded-2xl bg-card px-6 py-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
            Todavía no registró ninguna sesión.
          </div>
        </section>
      )}

      <details className="group rounded-2xl bg-card ring-1 ring-foreground/10">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground">
          Logros del alumno
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{unlockedCards.length} / 50</span>
        </summary>
        <div className="px-4 pb-4">
          <StreakAchievements
            unlockedCards={unlockedCards}
            unlockedDates={unlockedDates}
            streakDays={streak}
            currentWeekDays={currentWeekDays}
            currentWeekRequired={currentWeekRequired}
            athleteName={athlete.full_name ?? ''}
          />
        </div>
      </details>
    </div>
  )
}

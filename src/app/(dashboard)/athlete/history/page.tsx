'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronDown, Dumbbell } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { weekdayName } from '@/lib/weekdays'
import { formatDuration } from '@/lib/validations/routine'
import { cn } from '@/lib/utils'

interface Session {
  week: number
  day: number
  date: string
  exercises: Array<{
    exercise_id: string
    exercise_name: string
    category: string
    sets: Array<{
      set_number: number
      weight_kg: number
      reps: number | null
      duration_seconds: number | null
      rpe: number | null
      rir: number | null
      notes: string
    }>
  }>
  total_volume: number
  total_sets: number
  avg_rpe: number | null
}

export default function AthleteHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [filterWeek, setFilterWeek] = useState<number | 'all'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: routine } = await supabase
        .from('athlete_routines')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()

      if (!routine) {
        setSessions([])
        setLoading(false)
        return
      }

      const { data: sets } = await supabase
        .from('sets_log')
        .select(`
          week,
          day,
          completed_at,
          set_number,
          weight_kg,
          reps,
          duration_seconds,
          rpe,
          rir,
          notes,
          exercise_id,
          exercises!sets_log_exercise_id_fkey(name, category)
        `)
        .eq('athlete_routine_id', routine.id)
        .order('completed_at', { ascending: false })

      if (!sets) {
        setSessions([])
        setLoading(false)
        return
      }

      // Group by week, day, date
      const sessionMap = new Map<string, Session>()

      sets.forEach(set => {
        const date = set.completed_at.split('T')[0]
        const key = `${set.week}-${set.day}-${date}`
        
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            week: set.week,
            day: set.day,
            date,
            exercises: [],
            total_volume: 0,
            total_sets: 0,
            avg_rpe: null,
          })
        }

        const session = sessionMap.get(key)!
        if (set.reps !== null) session.total_volume += set.weight_kg * set.reps
        session.total_sets += 1
        if (set.rpe) {
          session.avg_rpe = session.avg_rpe === null ? set.rpe : (session.avg_rpe + set.rpe) / 2
        }

        // Find or create exercise
        let exercise = session.exercises.find(e => e.exercise_id === set.exercise_id)
        if (!exercise) {
          exercise = {
            exercise_id: set.exercise_id,
            exercise_name: (set.exercises as any)?.name || 'Ejercicio',
            category: (set.exercises as any)?.category || 'other',
            sets: [],
          }
          session.exercises.push(exercise)
        }

        exercise.sets.push({
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          reps: set.reps,
          duration_seconds: set.duration_seconds,
          rpe: set.rpe,
          rir: set.rir,
          notes: set.notes || '',
        })
      })

      const sortedSessions = Array.from(sessionMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      setSessions(sortedSessions)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = filterWeek === 'all' 
    ? sessions 
    : sessions.filter(s => s.week === filterWeek)

  const weeks = [...new Set(sessions.map(s => s.week))].sort((a, b) => b - a)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const groups: { label: string; items: Session[] }[] = []
  for (const s of filteredSessions) {
    const label = capitalize(format(parseISO(s.date), 'MMMM yyyy', { locale: es }))
    const last = groups.at(-1)
    if (last && last.label === label) last.items.push(s)
    else groups.push({ label, items: [s] })
  }

  const chip = (active: boolean) =>
    cn(
      'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
    )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Historial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? 'sesión registrada' : 'sesiones registradas'}
        </p>
      </div>

      {weeks.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button type="button" onClick={() => setFilterWeek('all')} className={chip(filterWeek === 'all')}>
            Todas
          </button>
          {weeks.map(w => (
            <button key={w} type="button" onClick={() => setFilterWeek(w)} className={chip(filterWeek === w)}>
              Semana {w}
            </button>
          ))}
        </div>
      )}

      {filteredSessions.length === 0 ? (
        <div className="rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
          <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-foreground">Todavía no hay sesiones</p>
          <p className="mt-1 text-sm text-muted-foreground">Cuando registres tu primer entrenamiento, lo vas a ver acá.</p>
        </div>
      ) : (
        groups.map(group => (
          <section key={group.label} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-muted-foreground">{group.label}</h2>
            <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
              {group.items.map(session => {
                const sessionKey = `${session.week}-${session.day}-${session.date}`
                const isExpanded = expandedSession === sessionKey
                const date = parseISO(session.date)

                return (
                  <div key={sessionKey}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedSession(isExpanded ? null : sessionKey)}
                      className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="w-10 shrink-0 text-center">
                        <p className="font-mono text-xl font-semibold leading-none tabular-nums text-foreground">{format(date, 'd')}</p>
                        <p className="mt-1 text-xs uppercase text-muted-foreground">{format(date, 'EEE', { locale: es })}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          Semana {session.week} · {weekdayName(session.day)}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {session.exercises.length} ejercicios · {session.total_sets} series · {session.total_volume.toLocaleString('es-AR')} kg
                        </p>
                      </div>
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform', isExpanded && 'rotate-180')} />
                    </button>

                    {isExpanded && (
                      <div className="flex flex-col gap-5 bg-muted/30 px-4 py-4">
                        {session.avg_rpe !== null && (
                          <p className="text-sm text-muted-foreground">
                            Esfuerzo promedio <span className="font-mono font-medium tabular-nums text-foreground">{session.avg_rpe.toFixed(1)}</span>
                          </p>
                        )}
                        {session.exercises.map(exercise => (
                          <div key={exercise.exercise_id}>
                            <p className="mb-1 font-medium text-foreground">{exercise.exercise_name}</p>
                            <div className="divide-y divide-border">
                              {[...exercise.sets]
                                .sort((a, b) => a.set_number - b.set_number)
                                .map(set => (
                                  <div key={set.set_number} className="py-2">
                                    <div className="flex items-baseline gap-3 text-sm">
                                      <span className="w-14 shrink-0 text-muted-foreground">Serie {set.set_number}</span>
                                      <span className="font-mono font-medium tabular-nums text-foreground">
                                        {set.weight_kg > 0 ? `${set.weight_kg} kg` : 'Peso corporal'}
                                        {' × '}
                                        {set.duration_seconds ? formatDuration(set.duration_seconds) : set.reps}
                                      </span>
                                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                                        {[set.rpe ? `RPE ${set.rpe.toFixed(1)}` : null, set.rir ? `RIR ${set.rir.toFixed(1)}` : null]
                                          .filter(Boolean)
                                          .join(' · ')}
                                      </span>
                                    </div>
                                    {set.notes && <p className="mt-1 pl-[68px] text-sm text-muted-foreground">{set.notes}</p>}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

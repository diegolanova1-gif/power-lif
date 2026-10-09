import type { createServerClient } from '@supabase/ssr'
import { calculateStreak, calculateWeeklyAdherence, type StreakSetLog, type AthleteRoutine } from '@/lib/calculations/adherence'
import { detectAdherenceDrop, detectStreakBroken, detectOneRMStalled, type AthleteAlert } from '@/lib/calculations/alerts'
import { mondayOf } from '@/lib/schedule-dates'
import type { RoutineStructure } from '@/lib/validations/routine'

type Supabase = ReturnType<typeof createServerClient>

const COMPETITION_LIFTS: Record<string, string> = { squat: 'Sentadilla', bench: 'Banca', deadlift: 'Peso muerto' }

export interface AthleteAlertSummary {
  athleteId: string
  athleteName: string
  alerts: AthleteAlert[]
}

/**
 * Para cada alumno del coach con rutina activa: racha rota, adherencia
 * cayendo o 1RM estancado en algún levantamiento de competencia. Solo
 * devuelve a quienes tienen al menos una alerta — pensado para un cartel
 * "necesitan atención" en el dashboard, no para mostrar a todos.
 */
export async function getAthleteAlerts(supabase: Supabase, coachId: string): Promise<AthleteAlertSummary[]> {
  const { data: links } = await supabase
    .from('coach_athletes')
    .select('athlete_id, profiles:athlete_id(full_name)')
    .eq('coach_id', coachId)

  const athletes = (links ?? []).map(l => ({
    id: l.athlete_id as string,
    name: (l.profiles as unknown as { full_name: string | null } | null)?.full_name ?? 'Alumno',
  }))

  const summaries = await Promise.all(
    athletes.map(async (athlete): Promise<AthleteAlertSummary> => {
      const { data: assigned } = await supabase
        .from('athlete_routines')
        .select('*, routine:routines(structure)')
        .eq('athlete_id', athlete.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const structure = (assigned?.routine as unknown as { structure: RoutineStructure } | null)?.structure
      if (!assigned || !structure) return { athleteId: athlete.id, athleteName: athlete.name, alerts: [] }

      const routine = { ...assigned, sessions_per_week: structure.schedule?.length || 4 } as AthleteRoutine

      const [{ data: sets }, { data: estimates }] = await Promise.all([
        supabase.from('sets_log').select('week, day, exercise_id, completed_at, extra_type').eq('athlete_routine_id', assigned.id),
        supabase
          .from('estimated_1rm')
          .select('estimated_1rm, calculated_at, exercises(category, is_competition_lift)')
          .eq('athlete_id', athlete.id),
      ])

      const alerts: AthleteAlert[] = []

      const streakInfo = calculateStreak((sets ?? []) as StreakSetLog[], structure)
      const monday = mondayOf(new Date())
      const hasPriorTraining = (sets ?? []).some(s => new Date(s.completed_at) < monday)
      if (detectStreakBroken(streakInfo.streak, hasPriorTraining)) {
        alerts.push({ type: 'streak_broken', message: 'Perdió la racha: no llegó al objetivo la semana pasada' })
      }

      // Semanas de programa ya cerradas (sin contar la actual, en curso)
      const weekly = Array.from({ length: Math.max(0, routine.current_week - 1) }, (_, i) => i + 1).map(w => ({
        week: w,
        adherence: calculateWeeklyAdherence(routine, sets ?? [], w),
      }))
      if (detectAdherenceDrop(weekly)) {
        alerts.push({ type: 'adherence_dropping', message: 'Adherencia cayendo 2 semanas seguidas' })
      }

      for (const [category, label] of Object.entries(COMPETITION_LIFTS)) {
        const points = (estimates ?? [])
          .filter(e => {
            const ex = e.exercises as unknown as { category: string; is_competition_lift: boolean } | null
            return ex?.is_competition_lift && ex.category === category
          })
          .map(e => ({ date: e.calculated_at as string, value: Number(e.estimated_1rm) }))
        if (detectOneRMStalled(points)) {
          alerts.push({ type: 'one_rm_stalled', message: `${label}: sin marca nueva en 3+ semanas` })
        }
      }

      return { athleteId: athlete.id, athleteName: athlete.name, alerts }
    })
  )

  return summaries.filter(s => s.alerts.length > 0)
}

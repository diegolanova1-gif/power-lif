'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const uuid = z.string().uuid()

interface RankingEntry {
  athlete_id: string
  full_name: string
  current_e1rm: number
  first_e1rm: number
  progress_pct: number
  current_norm: number
  progress_norm: number
  score: number
  rank: number
}

// Epley + reps en reserva (misma fórmula que set_e1rm en supabase/migrations/20260926_teams.sql)
function estimateE1rm(weightKg: number, reps: number, rpe: number | null) {
  const reserve = rpe == null ? 0 : 10 - rpe
  const effectiveReps = reps + reserve
  return effectiveReps <= 1 ? weightKg : weightKg * (1 + effectiveReps / 30)
}

function normalize(value: number, min: number, max: number) {
  return max === min ? 100 : ((value - min) / (max - min)) * 100
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export async function setLeadExercise(teamId: string, exerciseId: string | null) {
  const ids = z.object({ teamId: uuid, exerciseId: uuid.nullable() }).safeParse({ teamId, exerciseId })
  if (!ids.success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('teams')
    .update({ lead_exercise_id: exerciseId })
    .eq('id', teamId)
    .eq('coach_id', user.id)
  if (error) return { error: error.message }

  revalidatePath(`/coach/teams/${teamId}`)
  return { success: true }
}

// Criterio combinado: 60% peso actual (mejor 1RM estimado) + 40% progreso desde el primer registro,
// cada uno normalizado 0-100 dentro del team. Validado con Diego (Paso 2).
export async function calculateRanking(teamId: string) {
  if (!uuid.safeParse(teamId).success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: team } = await supabase
    .from('teams')
    .select('id, lead_exercise_id')
    .eq('id', teamId)
    .eq('coach_id', user.id)
    .maybeSingle()
  if (!team) return { error: 'Team no encontrado' }
  if (!team.lead_exercise_id) return { error: 'Elegí un ejercicio líder primero' }

  const { data: members } = await supabase
    .from('team_members')
    .select('athlete_id, profiles:athlete_id(full_name)')
    .eq('team_id', teamId)
  const athletes = (members ?? []).map(m => ({
    id: m.athlete_id as string,
    name: (m.profiles as unknown as { full_name: string | null } | null)?.full_name || 'Alumno',
  }))
  if (athletes.length === 0) return { error: 'El team no tiene alumnos' }

  const { data: sets, error: setsError } = await supabase
    .from('sets_log')
    .select('athlete_id, weight_kg, reps, rpe, completed_at')
    .eq('exercise_id', team.lead_exercise_id)
    .in('athlete_id', athletes.map(a => a.id))
    .gt('reps', 0)
    .gt('weight_kg', 0)
    .order('completed_at', { ascending: true })
  if (setsError) return { error: setsError.message }

  const firstByAthlete = new Map<string, number>()
  const bestByAthlete = new Map<string, number>()
  for (const s of sets ?? []) {
    const value = estimateE1rm(Number(s.weight_kg), s.reps, s.rpe == null ? null : Number(s.rpe))
    if (!firstByAthlete.has(s.athlete_id)) firstByAthlete.set(s.athlete_id, value)
    bestByAthlete.set(s.athlete_id, Math.max(bestByAthlete.get(s.athlete_id) ?? 0, value))
  }

  const withData = athletes
    .filter(a => bestByAthlete.has(a.id))
    .map(a => {
      const current = bestByAthlete.get(a.id)!
      const first = firstByAthlete.get(a.id)!
      const progressPct = first > 0 ? ((current - first) / first) * 100 : 0
      return { athleteId: a.id, name: a.name, current, first, progressPct }
    })
  if (withData.length === 0) return { error: 'Nadie del team registró el ejercicio líder todavía' }

  const currentValues = withData.map(a => a.current)
  const progressValues = withData.map(a => a.progressPct)
  const currentMin = Math.min(...currentValues)
  const currentMax = Math.max(...currentValues)
  const progressMin = Math.min(...progressValues)
  const progressMax = Math.max(...progressValues)

  const entries: RankingEntry[] = withData
    .map(a => {
      const currentNorm = normalize(a.current, currentMin, currentMax)
      const progressNorm = normalize(a.progressPct, progressMin, progressMax)
      return {
        athlete_id: a.athleteId,
        full_name: a.name,
        current_e1rm: round1(a.current),
        first_e1rm: round1(a.first),
        progress_pct: round1(a.progressPct),
        current_norm: round1(currentNorm),
        progress_norm: round1(progressNorm),
        score: round1(0.6 * currentNorm + 0.4 * progressNorm),
        rank: 0,
      }
    })
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  const { data: draft, error: insertError } = await supabase
    .from('team_rankings')
    .insert({ team_id: teamId, lead_exercise_id: team.lead_exercise_id, calculated_by: user.id, entries })
    .select('id')
    .single()
  if (insertError) return { error: insertError.message }

  revalidatePath(`/coach/teams/${teamId}`)
  return { success: true, rankingId: draft.id as string }
}

export async function approveRanking(teamId: string, rankingId: string) {
  const ids = z.object({ teamId: uuid, rankingId: uuid }).safeParse({ teamId, rankingId })
  if (!ids.success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('team_rankings')
    .update({ approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', rankingId)
    .eq('team_id', teamId)
  if (error) return { error: error.message }

  revalidatePath(`/coach/teams/${teamId}`)
  revalidatePath('/athlete/team')
  return { success: true }
}

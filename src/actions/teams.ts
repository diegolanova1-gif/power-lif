'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const teamNameSchema = z.string().trim().min(1, 'Ponle un nombre al team').max(60, 'Máximo 60 caracteres')

// RLS: teams_coach_all / team_members_coach_* restrict everything to the coach's own teams and athletes

export async function createTeam(name: string) {
  const validation = teamNameSchema.safeParse(name)
  if (!validation.success) return { error: validation.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('teams')
    .insert({ coach_id: user.id, name: validation.data })
    .select('id')
    .single()
  if (error) return { error: error.message }

  revalidatePath('/coach/teams')
  return { success: true, teamId: data.id as string }
}

export async function deleteTeam(teamId: string) {
  if (!z.string().uuid().safeParse(teamId).success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('teams').delete().eq('id', teamId).eq('coach_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/coach/teams')
  return { success: true }
}

export async function setTeamMember(teamId: string, athleteId: string, member: boolean) {
  const ids = z.object({ teamId: z.string().uuid(), athleteId: z.string().uuid() }).safeParse({ teamId, athleteId })
  if (!ids.success) return { error: 'ID inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = member
    ? await supabase.from('team_members').upsert({ team_id: teamId, athlete_id: athleteId }, { onConflict: 'team_id,athlete_id', ignoreDuplicates: true })
    : await supabase.from('team_members').delete().eq('team_id', teamId).eq('athlete_id', athleteId)
  if (error) return { error: error.message }

  revalidatePath(`/coach/teams/${teamId}`)
  revalidatePath('/coach/teams')
  return { success: true }
}

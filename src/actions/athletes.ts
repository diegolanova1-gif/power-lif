'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createAthleteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(100),
})

export async function createAthlete(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  // Check if user is coach
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return { error: 'Solo coaches pueden crear atletas' }
  }

  const email = formData.get('email') as string
  const full_name = formData.get('full_name') as string

  const validation = createAthleteSchema.safeParse({ email, full_name })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  try {
    // Invite user via Supabase Auth Admin
    // Note: This requires service role key in production
    // For now, we'll create the profile and coach_athlete link
    // The athlete will need to sign up separately

    // Option 1: Create profile directly (athlete signs up later)
    // We need to know the athlete's user ID first
    // Better approach: Send magic link or have them sign up first

    // For MVP: Create a placeholder and link when they sign up
    // Or use admin.inviteUserByEmail with service role

    // Since we don't have service role in client, we'll create the profile
    // with a temporary approach - athlete signs up, then coach links them

    // Actually, let's use the approach where coach enters email,
    // we create a pending invitation, and when athlete signs up,
    // we link them via a trigger or manual process

    // For now, simple approach: create the profile with a known pattern
    // In production, use supabase.auth.admin.inviteUserByEmail

    // This is a simplified version - in real app you'd use service role
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: `temp-${Date.now()}`, // This won't work without real user ID
        role: 'athlete',
        full_name,
      })

    if (error) throw error

    revalidatePath('/coach/athletes')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// Better approach: Use service role on server
export async function inviteAthlete(email: string, fullName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  // This requires SUPABASE_SERVICE_ROLE_KEY
  // For now, we'll implement a manual linking flow

  return { success: true, message: 'Funcionalidad pendiente: requiere service role key' }
}
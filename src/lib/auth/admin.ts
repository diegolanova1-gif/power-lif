import { createClient } from '@/lib/supabase/server'

// Returns the signed-in admin's id, or null. Every /admin page and /api/admin route must call this.
export async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, active')
    .eq('id', user.id)
    .single()

  return profile?.is_admin && profile.active ? user.id : null
}

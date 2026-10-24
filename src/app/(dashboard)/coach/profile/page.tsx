import { createClient } from '@/lib/supabase/server'
import { CoachProfileForm, type CoachProfileData } from '@/components/coach/coach-profile-form'
import { CoachAccountSection } from '@/components/coach/coach-account-section'

const EMPTY: CoachProfileData = {
  phone: null,
  whatsapp: null,
  city: null,
  gym_name: null,
  bio: null,
  specialization: null,
  years_experience: null,
  certifications: null,
}

export default async function CoachProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: details }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('coach_profile').select('*').eq('coach_id', user.id).maybeSingle(),
  ])

  const initial: CoachProfileData = details
    ? {
        phone: details.phone,
        whatsapp: details.whatsapp,
        city: details.city,
        gym_name: details.gym_name,
        bio: details.bio,
        specialization: details.specialization,
        years_experience: details.years_experience,
        certifications: details.certifications,
      }
    : EMPTY

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.full_name || 'Tus datos'}{profile?.email ? ` · ${profile.email}` : ''}
        </p>
      </div>
      <CoachAccountSection coachId={user.id} fullName={profile?.full_name ?? null} email={profile?.email ?? user.email ?? null} />
      <CoachProfileForm coachId={user.id} initial={initial} />
    </div>
  )
}

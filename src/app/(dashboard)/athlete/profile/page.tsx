import { createClient } from '@/lib/supabase/server'
import { ProfileForm, type AthleteProfileData } from '@/components/athlete/profile-form'
import { AccountSection } from '@/components/athlete/account-section'
import { ThemeSelector } from '@/components/athlete/theme-selector'

const EMPTY: AthleteProfileData = {
  birth_date: null,
  sex: null,
  height_cm: null,
  bodyweight_kg: null,
  phone: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  goal: null,
  experience: null,
  days_per_week: null,
  injuries: null,
  medical_notes: null,
  notes: null,
}

export default async function AthleteProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: details }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('athlete_profile').select('*').eq('athlete_id', user.id).maybeSingle(),
  ])

  const initial: AthleteProfileData = details
    ? {
        birth_date: details.birth_date,
        sex: details.sex,
        height_cm: details.height_cm === null ? null : Number(details.height_cm),
        bodyweight_kg: details.bodyweight_kg === null ? null : Number(details.bodyweight_kg),
        phone: details.phone,
        emergency_contact_name: details.emergency_contact_name,
        emergency_contact_phone: details.emergency_contact_phone,
        goal: details.goal,
        experience: details.experience,
        days_per_week: details.days_per_week,
        injuries: details.injuries,
        medical_notes: details.medical_notes,
        notes: details.notes,
      }
    : EMPTY

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.full_name || 'Tus datos'}{profile?.email ? ` · ${profile.email}` : ''}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Completalo a tu ritmo. Tu coach ve estos datos para armarte la rutina y cuidarte.
        </p>
      </div>
      <ThemeSelector />
      <AccountSection athleteId={user.id} fullName={profile?.full_name ?? null} email={profile?.email ?? user.email ?? null} />
      <ProfileForm athleteId={user.id} initial={initial} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { RoutineBuilder } from '@/components/coach/routine-builder'
import type { RoutineTemplate } from '@/components/coach/routine-start-picker'

export default async function NewRoutinePage({ searchParams }: { searchParams: Promise<{ athlete?: string }> }) {
  const { athlete: athleteId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const coachId = user?.id ?? ''

  const [{ data: exercises }, { data: templates }, { data: link }] = await Promise.all([
    supabase
      .from('exercises')
      .select('id, name, category, is_competition_lift')
      .order('is_competition_lift', { ascending: false })
      .order('name'),
    supabase
      .from('routines')
      .select('id, name, description, structure')
      .eq('coach_id', coachId)
      .eq('is_template', true)
      .order('updated_at', { ascending: false }),
    athleteId
      ? supabase
          .from('coach_athletes')
          .select('profiles:athlete_id(id, full_name)')
          .eq('coach_id', coachId)
          .eq('athlete_id', athleteId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const athlete = (link?.profiles as unknown as { id: string; full_name: string | null } | null) ?? undefined

  return (
    <RoutineBuilder
      exercises={exercises ?? []}
      templates={(templates ?? []) as RoutineTemplate[]}
      athlete={athlete}
    />
  )
}

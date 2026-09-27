import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RoutineBuilder } from '@/components/coach/routine-builder'

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: routine }, { data: exercises }] = await Promise.all([
    supabase
      .from('routines')
      .select('id, name, description, structure')
      .eq('id', id)
      .eq('coach_id', user?.id ?? '')
      .maybeSingle(),
    supabase
      .from('exercises')
      .select('id, name, category, is_competition_lift')
      .order('is_competition_lift', { ascending: false })
      .order('name'),
  ])

  if (!routine) notFound()

  return <RoutineBuilder exercises={exercises ?? []} routine={routine} />
}

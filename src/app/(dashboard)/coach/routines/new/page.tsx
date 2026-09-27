import { createClient } from '@/lib/supabase/server'
import { RoutineBuilder } from '@/components/coach/routine-builder'

export default async function NewRoutinePage() {
  const supabase = await createClient()

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, category, is_competition_lift')
    .order('is_competition_lift', { ascending: false })
    .order('name')

  return <RoutineBuilder exercises={exercises ?? []} />
}

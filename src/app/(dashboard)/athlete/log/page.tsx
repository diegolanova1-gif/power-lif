import { createClient } from '@/lib/supabase/server'
import { loadWorkout } from '@/lib/load-workout'
import { LogView } from '@/components/athlete/log-view'

export default async function AthleteLogPage() {
  const supabase = await createClient()
  const data = await loadWorkout(supabase)
  return <LogView initialData={data} />
}

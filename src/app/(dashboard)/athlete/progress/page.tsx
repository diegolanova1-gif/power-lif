import { createClient } from '@/lib/supabase/server'
import { loadProgress } from '@/lib/load-progress'
import { ProgressView } from '@/components/athlete/progress-view'

export default async function AthleteProgressPage() {
  const supabase = await createClient()
  const data = await loadProgress(supabase)

  if (!data) {
    return (
      <div className="rounded-xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        Todavía no tenés datos de progreso.
      </div>
    )
  }

  return <ProgressView data={data} />
}

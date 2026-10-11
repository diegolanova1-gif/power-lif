import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const MEDALS = ['🥇', '🥈', '🥉']

interface RankingEntry {
  athlete_id: string
  full_name: string
  current_e1rm: number
  progress_pct: number
  score: number
  rank: number
}

interface Ranking {
  approved_at: string
  entries: RankingEntry[]
}

export function TeamRankingOfficial({ ranking, currentUserId }: { ranking: Ranking | null; currentUserId?: string }) {
  if (!ranking) {
    return (
      <div className="rounded-2xl bg-card px-6 py-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        Tu coach todavía no aprobó un ranking para este team.
      </div>
    )
  }

  const me = ranking.entries.find(e => e.athlete_id === currentUserId)

  return (
    <div className="flex flex-col gap-4">
      {me && (
        <div className="flex items-center justify-between rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tu posición</p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground">
              {MEDALS[me.rank - 1] ?? `#${me.rank}`}
              <span className="ml-2 text-lg font-normal text-muted-foreground">de {ranking.entries.length}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Score</p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-foreground">{me.score}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="px-1 text-sm font-medium text-muted-foreground">
          Ranking oficial · aprobado el {format(parseISO(ranking.approved_at), "d 'de' MMMM", { locale: es })}
        </h3>
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {ranking.entries.map(e => (
            <div
              key={e.athlete_id}
              className={cn('flex items-center gap-3 px-4 py-3', e.athlete_id === currentUserId && 'bg-muted/60')}
            >
              <span className="w-8 shrink-0 text-center font-mono text-sm tabular-nums text-muted-foreground">
                {MEDALS[e.rank - 1] ?? e.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {e.full_name}
                  {e.athlete_id === currentUserId && <span className="font-normal text-muted-foreground"> · vos</span>}
                </p>
                <p className="font-mono text-sm tabular-nums text-muted-foreground">
                  {e.current_e1rm} kg
                  <span className={cn('ml-2', e.progress_pct > 0 && 'text-success')}>
                    {e.progress_pct > 0 ? '+' : ''}{e.progress_pct}%
                  </span>
                </p>
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{e.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-500" />
          Ranking oficial
        </CardTitle>
        {ranking && (
          <p className="text-sm text-muted-foreground">
            Aprobado por tu coach el {format(parseISO(ranking.approved_at), "dd MMM yyyy", { locale: es })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!ranking ? (
          <p className="py-8 text-center text-muted-foreground">Tu coach todavía no aprobó un ranking para este team.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Alumno</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Progreso</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.entries.map(e => (
                <TableRow key={e.athlete_id} className={cn(e.athlete_id === currentUserId && 'bg-primary/5 font-medium')}>
                  <TableCell className="font-mono tabular-nums">{MEDALS[e.rank - 1] ?? e.rank}</TableCell>
                  <TableCell>{e.full_name}{e.athlete_id === currentUserId && ' (vos)'}</TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">{e.current_e1rm} kg</TableCell>
                  <TableCell className={cn('text-right font-mono tabular-nums', e.progress_pct > 0 ? 'text-success' : e.progress_pct < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {e.progress_pct > 0 ? '+' : ''}{e.progress_pct}%
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">{e.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

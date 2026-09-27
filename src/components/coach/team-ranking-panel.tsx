'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { setLeadExercise, calculateRanking, approveRanking } from '@/actions/team-ranking'
import { cn } from '@/lib/utils'

interface Exercise {
  id: string
  name: string
  category: string | null
  is_competition_lift: boolean
}

interface RankingEntry {
  athlete_id: string
  full_name: string
  current_e1rm: number
  first_e1rm: number
  progress_pct: number
  score: number
  rank: number
}

interface Ranking {
  id: string
  calculated_at: string
  approved_at: string | null
  entries: RankingEntry[]
}

export function TeamRankingPanel({
  teamId,
  exercises,
  leadExerciseId,
  rankings,
}: {
  teamId: string
  exercises: Exercise[]
  leadExerciseId: string | null
  rankings: Ranking[]
}) {
  const router = useRouter()
  const [savingExercise, setSavingExercise] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  async function handleExerciseChange(exerciseId: string) {
    setSavingExercise(true)
    const result = await setLeadExercise(teamId, exerciseId)
    setSavingExercise(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  async function handleCalculate() {
    setCalculating(true)
    const result = await calculateRanking(teamId)
    setCalculating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Ranking calculado, revisalo antes de aprobar')
    router.refresh()
  }

  async function handleApprove(rankingId: string) {
    setApprovingId(rankingId)
    const result = await approveRanking(teamId, rankingId)
    setApprovingId(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Ranking aprobado: ya lo ven los alumnos')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Ranking oficial
        </CardTitle>
        <p className="text-sm text-gray-500">
          Combina fuerza actual y progreso sobre el ejercicio líder. Los alumnos solo ven el último ranking que apruebes.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Ejercicio líder</span>
          <Select
            value={leadExerciseId}
            onValueChange={v => v && handleExerciseChange(v)}
            items={Object.fromEntries(exercises.map(e => [e.id, e.name]))}
          >
            <SelectTrigger className="w-64" disabled={savingExercise}>
              <SelectValue placeholder="Elegí un ejercicio..." />
            </SelectTrigger>
            <SelectContent>
              {exercises.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleCalculate} disabled={!leadExerciseId || calculating}>
            {calculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Calcular ranking
          </Button>
        </div>

        {rankings.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no calculaste ningún ranking para este team.</p>
        ) : (
          <div className="space-y-6">
            {rankings.map(r => (
              <div key={r.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Calculado el {format(parseISO(r.calculated_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                    <Badge variant={r.approved_at ? 'default' : 'outline'}>
                      {r.approved_at ? 'Aprobado' : 'Borrador'}
                    </Badge>
                  </div>
                  {!r.approved_at && (
                    <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)} disabled={approvingId === r.id}>
                      {approvingId === r.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Aprobar y publicar
                    </Button>
                  )}
                </div>
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
                    {r.entries.map(e => (
                      <TableRow key={e.athlete_id}>
                        <TableCell>{e.rank}</TableCell>
                        <TableCell>{e.full_name}</TableCell>
                        <TableCell className="text-right">{e.current_e1rm} kg</TableCell>
                        <TableCell className={cn('text-right', e.progress_pct > 0 ? 'text-emerald-600' : e.progress_pct < 0 ? 'text-red-600' : 'text-gray-500')}>
                          {e.progress_pct > 0 ? '+' : ''}{e.progress_pct}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">{e.score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

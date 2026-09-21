'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronUp, Calendar, Dumbbell } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Session {
  week: number
  day: number
  date: string
  exercises: Array<{
    exercise_id: string
    exercise_name: string
    category: string
    sets: Array<{
      set_number: number
      weight_kg: number
      reps: number
      rpe: number | null
      rir: number | null
      notes: string
    }>
  }>
  total_volume: number
  total_sets: number
  avg_rpe: number | null
}

export default function AthleteHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [filterWeek, setFilterWeek] = useState<number | 'all'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: routine } = await supabase
        .from('athlete_routines')
        .select('id')
        .eq('athlete_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()

      if (!routine) {
        setSessions([])
        setLoading(false)
        return
      }

      const { data: sets } = await supabase
        .from('sets_log')
        .select(`
          week,
          day,
          completed_at,
          set_number,
          weight_kg,
          reps,
          rpe,
          rir,
          notes,
          exercise_id,
          exercises(name, category)
        `)
        .eq('athlete_routine_id', routine.id)
        .order('completed_at', { ascending: false })

      if (!sets) {
        setSessions([])
        setLoading(false)
        return
      }

      // Group by week, day, date
      const sessionMap = new Map<string, Session>()

      sets.forEach(set => {
        const date = set.completed_at.split('T')[0]
        const key = `${set.week}-${set.day}-${date}`
        
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            week: set.week,
            day: set.day,
            date,
            exercises: [],
            total_volume: 0,
            total_sets: 0,
            avg_rpe: null,
          })
        }

        const session = sessionMap.get(key)!
        session.total_volume += set.weight_kg * set.reps
        session.total_sets += 1
        if (set.rpe) {
          session.avg_rpe = session.avg_rpe === null ? set.rpe : (session.avg_rpe + set.rpe) / 2
        }

        // Find or create exercise
        let exercise = session.exercises.find(e => e.exercise_id === set.exercise_id)
        if (!exercise) {
          exercise = {
            exercise_id: set.exercise_id,
            exercise_name: (set.exercises as any)?.name || 'Ejercicio',
            category: (set.exercises as any)?.category || 'other',
            sets: [],
          }
          session.exercises.push(exercise)
        }

        exercise.sets.push({
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          reps: set.reps,
          rpe: set.rpe,
          rir: set.rir,
          notes: set.notes || '',
        })
      })

      const sortedSessions = Array.from(sessionMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      setSessions(sortedSessions)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = filterWeek === 'all' 
    ? sessions 
    : sessions.filter(s => s.week === filterWeek)

  const weeks = [...new Set(sessions.map(s => s.week))].sort((a, b) => b - a)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Entrenamientos</h1>
          <p className="text-gray-500 mt-1">{sessions.length} sesiones registradas</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filtrar por semana:</label>
          <select
            value={filterWeek}
            onChange={e => setFilterWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="ml-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Todas las semanas</option>
            {weeks.map(w => (
              <option key={w} value={w}>Semana {w}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay sesiones registradas</p>
            <p className="text-sm text-gray-400 mt-1">Empieza a entrenar para ver tu historial aquí</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const sessionKey = `${session.week}-${session.day}-${session.date}`
            const isExpanded = expandedSession === sessionKey

            return (
              <Card key={sessionKey}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedSession(isExpanded ? null : sessionKey)}
                        className="h-8 w-8"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Semana {session.week} - Día {session.day}
                          </span>
                          <Badge variant="outline">{session.exercises.length} ejercicios</Badge>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(session.date), 'EEEE, dd MMMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{session.total_sets} series</span>
                      <span>{session.total_volume.toLocaleString()} kg vol</span>
                      {session.avg_rpe && (
                        <span className="flex items-center gap-1">
                          <Badge variant="secondary">RPE {session.avg_rpe.toFixed(1)}</Badge>
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {session.exercises.map(exercise => (
                        <div key={exercise.exercise_id} className="border-t pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{exercise.exercise_name}</span>
                            <Badge variant="outline" className="capitalize">{exercise.category}</Badge>
                            <Badge variant="secondary">{exercise.sets.length} series</Badge>
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Serie</TableHead>
                                  <TableHead>Peso (kg)</TableHead>
                                  <TableHead>Reps</TableHead>
                                  <TableHead>RPE</TableHead>
                                  <TableHead>RIR</TableHead>
                                  <TableHead>Volumen</TableHead>
                                  <TableHead>Notas</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exercise.sets
                                  .sort((a, b) => a.set_number - b.set_number)
                                  .map(set => (
                                    <TableRow key={set.set_number}>
                                      <TableCell>{set.set_number}</TableCell>
                                      <TableCell className="font-mono font-medium">{set.weight_kg}</TableCell>
                                      <TableCell>{set.reps}</TableCell>
                                      <TableCell>{set.rpe?.toFixed(1) || '-'}</TableCell>
                                      <TableCell>{set.rir?.toFixed(1) || '-'}</TableCell>
                                      <TableCell className="font-medium">
                                        {(set.weight_kg * set.reps).toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-gray-500 max-w-xs truncate">
                                        {set.notes || '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
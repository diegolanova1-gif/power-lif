'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, UserPlus, Search, Loader2, MoreHorizontal, Edit, Trash2, Dumbbell, LayoutTemplate, BarChart, KeyRound, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { CreateAthleteDialog } from '@/components/coach/create-athlete-dialog'
import { ResetPasswordDialog } from '@/components/coach/reset-password-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Athlete {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  created_at: string
  current_routine: string | null
  current_routine_id: string | null
  last_session: string | null
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resetFor, setResetFor] = useState<Athlete | null>(null)

  const [supabase] = useState(() => createClient())

  // Load the list on mount (and again after creating/removing an athlete)
  useEffect(() => {
    fetchAthletes()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  async function fetchAthletes() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('coach_athletes')
        .select(`
          athlete_id,
          profiles:athlete_id (
            id,
            full_name,
            email,
            avatar_url,
            created_at
          )
        `)
        .eq('coach_id', user.id)

      if (error) throw error

      // Get current routine for each athlete
      const athleteIds = data?.map((d: any) => d.profiles?.id).filter(Boolean) || []
      let routines: any[] = []
      if (athleteIds.length > 0) {
        const { data: r } = await supabase
          .from('athlete_routines')
          .select('id, athlete_id, routine_id, status, routines(name)')
          .in('athlete_id', athleteIds)
          .eq('status', 'active')
        routines = r || []
      }

      // Get last session for each athlete
      let sessions: any[] = []
      if (athleteIds.length > 0) {
        const { data: s } = await supabase
          .from('sets_log')
          .select('athlete_id, completed_at')
          .in('athlete_id', athleteIds)
          .order('completed_at', { ascending: false })
          .limit(athleteIds.length)
        sessions = s || []
      }

      const lastSessions = new Map<string, string>()
      sessions.forEach(s => {
        if (!lastSessions.has(s.athlete_id)) {
          lastSessions.set(s.athlete_id, s.completed_at)
        }
      })

      const mapped = data?.map((item: any) => ({
        id: item.profiles?.id,
        full_name: item.profiles?.full_name,
        email: item.profiles?.email,
        avatar_url: item.profiles?.avatar_url,
        created_at: item.profiles?.created_at,
        current_routine: routines.find((r: any) => r.athlete_id === item.profiles?.id)?.routines?.name || null,
        current_routine_id: routines.find((r: any) => r.athlete_id === item.profiles?.id)?.routine_id || null,
        last_session: lastSessions.get(item.profiles?.id || '') || null,
      })) || []

      setAthletes(mapped)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function removeAthlete(athleteId: string) {
    if (!confirm('¿Eliminar alumno? Se desvinculará pero no se borrará su cuenta.')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('coach_athletes')
        .delete()
        .eq('coach_id', user.id)
        .eq('athlete_id', athleteId)

      if (error) throw error

      toast.success('Alumno eliminado')
      fetchAthletes()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredAthletes = athletes.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Alumnos</h1>
          <p className="text-gray-500 mt-1">Gestiona y supervisa el progreso de tus alumnos</p>
        </div>
        <CreateAthleteDialog onCreated={fetchAthletes}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Alumno
        </CreateAthleteDialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Alumnos ({athletes.length})</CardTitle>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar alumno..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">{search ? 'No se encontraron alumnos' : 'No tienes alumnos aún'}</p>
              {!search && (
                <CreateAthleteDialog triggerClassName="mt-4" onCreated={fetchAthletes}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer alumno
                </CreateAthleteDialog>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rutina Actual</TableHead>
                    <TableHead>Última Sesión</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAthletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {athlete.avatar_url ? (
                            <img src={athlete.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                          ) : (
                            <span className="text-gray-600 font-medium">
                              {athlete.full_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <Link href={`/coach/athletes/${athlete.id}`} className="font-medium hover:text-primary hover:underline">
                          {athlete.full_name || 'Sin nombre'}
                        </Link>
                      </TableCell>
                      <TableCell>{athlete.email}</TableCell>
                      <TableCell>
                        {athlete.current_routine ? (
                          <Link href={`/coach/routines/${athlete.current_routine_id}/edit`} title="Editar su rutina">
                            <Badge variant="secondary" className="hover:bg-gray-200">{athlete.current_routine}</Badge>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/coach/routines/new?athlete=${athlete.id}`} />}>
                            <Dumbbell className="mr-1 h-4 w-4" />
                            Armar rutina
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {athlete.last_session ? (
                          new Date(athlete.last_session).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-gray-400">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Acciones de ${athlete.full_name || 'alumno'}`} />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem render={<Link href={`/coach/athletes/${athlete.id}`} />}>
                              <ClipboardCheck className="mr-2 h-4 w-4" />
                              Ver seguimiento
                            </DropdownMenuItem>
                            <DropdownMenuItem render={<Link href={`/coach/routines/new?athlete=${athlete.id}`} />}>
                              <Plus className="mr-2 h-4 w-4" />
                              Nueva rutina personalizada
                            </DropdownMenuItem>
                            {athlete.current_routine_id && (
                              <DropdownMenuItem render={<Link href={`/coach/routines/${athlete.current_routine_id}/edit`} />}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar su rutina
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem render={<Link href={`/coach/routines?assign=${athlete.id}`} />}>
                              <LayoutTemplate className="mr-2 h-4 w-4" />
                              Asignar una plantilla
                            </DropdownMenuItem>
                            <DropdownMenuItem render={<Link href={`/coach/analytics?athlete=${athlete.id}`} />}>
                              <BarChart className="mr-2 h-4 w-4" />
                              Ver estadísticas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setResetFor(athlete)}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Cambiar contraseña
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => removeAthlete(athlete.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ResetPasswordDialog athlete={resetFor} onClose={() => setResetFor(null)} />
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, UserPlus, Search, Loader2, MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const createAthleteSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'Nombre muy corto').max(100),
})

type CreateAthleteForm = z.infer<typeof createAthleteSchema>

interface Athlete {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  created_at: string
  current_routine: string | null
  last_session: string | null
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  const form = useForm<CreateAthleteForm>({
    resolver: zodResolver(createAthleteSchema),
    defaultValues: { email: '', full_name: '' },
  })

  async function fetchAthletes() {
    setLoading(true)
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
      const athleteIds = data?.map(d => d.profiles?.id).filter(Boolean) || []
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
        last_session: lastSessions.get(item.profiles?.id || '') || null,
      })) || []

      setAthletes(mapped)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: CreateAthleteForm) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(data.email, {
        data: { full_name: data.full_name, role: 'athlete' },
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (inviteError) throw inviteError

      toast.success('Invitación enviada. El atleta recibirá un email para crear su cuenta.')
      form.reset()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function removeAthlete(athleteId: string) {
    if (!confirm('¿Eliminar atleta? Se desvinculará pero no se borrará su cuenta.')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('coach_athletes')
        .delete()
        .eq('coach_id', user.id)
        .eq('athlete_id', athleteId)

      if (error) throw error

      toast.success('Atleta eliminado')
      fetchAthletes()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredAthletes = athletes.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Atletas</h1>
          <p className="text-gray-500 mt-1">Gestiona y supervisa el progreso de tus atletas</p>
        </div>
        <Dialog>
          <DialogTrigger>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Atleta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Nuevo Atleta</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  placeholder="Juan Pérez"
                  {...form.register('full_name')}
                />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="atleta@email.com"
                  {...form.register('email')}
                />
                <p className="text-xs text-gray-500">Recibirá un email para crear su cuenta</p>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando... </ >
                  ) : (
                    'Enviar invitación'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Atletas ({athletes.length})</CardTitle>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar atleta..."
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
              <p className="text-gray-500">{search ? 'No se encontraron atletas' : 'No tienes atletas aún'}</p>
              {!search && (
                <Dialog>
                  <DialogTrigger>
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar primer atleta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invitar Nuevo Atleta</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre completo</Label>
                        <Input
                          id="full_name"
                          placeholder="Juan Pérez"
                          {...form.register('full_name')}
                        />
                        {form.formState.errors.full_name && (
                          <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="atleta@email.com"
                          {...form.register('email')}
                        />
                        <p className="text-xs text-gray-500">Recibirá un email para crear su cuenta</p>
                        {form.formState.errors.email && (
                          <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting ? 'Enviando...' : 'Enviar invitación'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atleta</TableHead>
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
                        <span className="font-medium">{athlete.full_name || 'Sin nombre'}</span>
                      </TableCell>
                      <TableCell>{athlete.email}</TableCell>
                      <TableCell>
                        {athlete.current_routine ? (
                          <Badge variant="secondary">{athlete.current_routine}</Badge>
                        ) : (
                          <Badge variant="outline">Sin asignar</Badge>
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
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <a href={`/coach/athletes/${athlete.id}`} className="flex items-center gap-2">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver Detalle
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <a href={`/coach/athletes/${athlete.id}/routine`} className="flex items-center gap-2">
                                <Edit className="mr-2 h-4 w-4" />
                                Asignar/Editar Rutina
                              </a>
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
    </div>
  )
}
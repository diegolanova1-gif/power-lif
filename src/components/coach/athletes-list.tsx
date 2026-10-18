'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { History, Plus, UserPlus, Search, MoreHorizontal, Edit, Trash2, Dumbbell, LayoutTemplate, BarChart, KeyRound, ClipboardCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { CreateAthleteDialog } from '@/components/coach/create-athlete-dialog'
import { ResetPasswordDialog } from '@/components/coach/reset-password-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PLANS, whatsappLink, WHATSAPP_MESSAGES, type PlanId } from '@/lib/contact'
import { useRouter } from 'next/navigation'

export interface AthleteRow {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  created_at: string
  current_routine: string | null
  current_routine_id: string | null
  last_session: string | null
}

interface AthletesListProps {
  initialAthletes: AthleteRow[]
  plan: PlanId
  studentLimit: number | null
}

export function AthletesList({ initialAthletes, plan, studentLimit }: AthletesListProps) {
  const [athletes, setAthletes] = useState(initialAthletes)
  const [search, setSearch] = useState('')
  const [resetFor, setResetFor] = useState<AthleteRow | null>(null)
  const router = useRouter()

  const [supabase] = useState(() => createClient())

  function onCreated() {
    router.refresh()
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

      setAthletes(prev => prev.filter(a => a.id !== athleteId))
      toast.success('Alumno eliminado')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredAthletes = athletes.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )

  const atLimit = studentLimit !== null && studentLimit !== undefined && athletes.length >= studentLimit

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Alumnos</h1>
          <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
            {studentLimit === null
              ? `${athletes.length} alumnos · Plan ${PLANS[plan].label}, sin límite`
              : `${athletes.length} de ${studentLimit} alumnos · Plan ${PLANS[plan].label}`}
          </p>
        </div>
        <CreateAthleteDialog onCreated={onCreated}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo alumno
        </CreateAthleteDialog>
      </div>

      {atLimit && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/20 p-4 sm:flex-row sm:items-center">
          <TriangleAlert className="h-5 w-5 shrink-0 text-warning-foreground" />
          <p className="flex-1 text-sm text-warning-foreground">Llegaste al límite de alumnos de tu plan.</p>
          <Button
            size="sm"
            nativeButton={false}
            render={<a href={whatsappLink(WHATSAPP_MESSAGES.upgrade)} target="_blank" rel="noopener noreferrer" />}
          >
            Ampliar mi plan por WhatsApp
          </Button>
        </div>
      )}

      {athletes.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar alumno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filteredAthletes.length === 0 ? (
        <div className="rounded-xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
          <UserPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{search ? 'No se encontraron alumnos' : 'Todavía no tenés alumnos.'}</p>
          {!search && (
            <CreateAthleteDialog triggerClassName="mt-4" onCreated={onCreated}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer alumno
            </CreateAthleteDialog>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {filteredAthletes.map((athlete) => (
            <div key={athlete.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
              <Link href={`/coach/athletes/${athlete.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {athlete.avatar_url ? (
                    <img src={athlete.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <span className="font-medium text-foreground">
                      {athlete.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{athlete.full_name || 'Sin nombre'}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {athlete.current_routine ?? 'Sin rutina'}
                    {' · '}
                    {athlete.last_session
                      ? new Date(athlete.last_session).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
                      : 'Sin sesiones'}
                  </p>
                </div>
              </Link>

              {!athlete.current_routine && (
                <Button
                  size="sm"
                  variant="outline"
                  className="hidden sm:inline-flex"
                  nativeButton={false}
                  render={<Link href={`/coach/routines/new?athlete=${athlete.id}`} />}
                >
                  <Dumbbell className="mr-1 h-4 w-4" />
                  Armar rutina
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Acciones de ${athlete.full_name || 'alumno'}`} />}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem render={<Link href={`/coach/athletes/${athlete.id}`} />}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Ver seguimiento
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/coach/athletes/${athlete.id}#historial`} />}>
                    <History className="mr-2 h-4 w-4" />
                    Ver historial
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
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
      <ResetPasswordDialog athlete={resetFor} onClose={() => setResetFor(null)} />
    </div>
  )
}

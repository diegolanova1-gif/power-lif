'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BarChart, History, KeyRound, LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { ResetPasswordDialog } from '@/components/coach/reset-password-dialog'

interface AthleteActionsProps {
  athleteId: string
  athleteName: string | null
  /** Rutina actual del alumno (null si no tiene) */
  routineId: string | null
}

// Todas las acciones por alumno en un solo lugar (las mismas del menú de la lista).
export function AthleteActions({ athleteId, athleteName, routineId }: AthleteActionsProps) {
  const router = useRouter()
  const [resetOpen, setResetOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function removeAthlete() {
    if (!confirm('¿Eliminar alumno? Se desvinculará pero no se borrará su cuenta.')) return
    setRemoving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('coach_athletes')
        .delete()
        .eq('coach_id', user.id)
        .eq('athlete_id', athleteId)
      if (error) throw error

      toast.success('Alumno eliminado')
      router.push('/coach/athletes')
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message)
      setRemoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Rutina</p>
        <div className="flex flex-wrap gap-2">
          {routineId && (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/coach/routines/${routineId}/edit`} />}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar su rutina
            </Button>
          )}
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/coach/routines/new?athlete=${athleteId}`} />}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva rutina personalizada
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/coach/routines?assign=${athleteId}`} />}>
            <LayoutTemplate className="mr-1.5 h-4 w-4" />
            Asignar una plantilla
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Alumno</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" nativeButton={false} render={<a href="#historial" />}>
            <History className="mr-1.5 h-4 w-4" />
            Ver historial
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/coach/analytics?athlete=${athleteId}`} />}>
            <BarChart className="mr-1.5 h-4 w-4" />
            Ver estadísticas
          </Button>
          <Button size="sm" variant="outline" onClick={() => setResetOpen(true)}>
            <KeyRound className="mr-1.5 h-4 w-4" />
            Cambiar contraseña
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={removeAthlete} disabled={removing}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar alumno
          </Button>
        </div>
      </div>

      <ResetPasswordDialog athlete={resetOpen ? { id: athleteId, full_name: athleteName } : null} onClose={() => setResetOpen(false)} />
    </div>
  )
}

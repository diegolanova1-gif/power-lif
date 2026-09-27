'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assignRoutine } from '@/actions/routines'

interface AssignRoutineDialogProps {
  routineId: string
  routineName: string
  athletes: { id: string; full_name: string | null }[]
  defaultAthleteId?: string
}

export function AssignRoutineDialog({ routineId, routineName, athletes, defaultAthleteId }: AssignRoutineDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [athleteId, setAthleteId] = useState<string | null>(
    athletes.some(a => a.id === defaultAthleteId) ? defaultAthleteId! : null
  )
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const athleteItems = Object.fromEntries(athletes.map(a => [a.id, a.full_name || 'Sin nombre']))

  async function handleAssign() {
    if (!athleteId) {
      toast.error('Selecciona un atleta')
      return
    }

    const formData = new FormData()
    formData.set('athlete_id', athleteId)
    formData.set('routine_id', routineId)
    formData.set('started_at', startedAt)

    setSaving(true)
    const result = await assignRoutine(formData)
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Rutina asignada a ${athleteItems[athleteId]}. Su programa anterior quedó en pausa.`)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={athletes.length === 0} />}>
        <UserPlus className="mr-1 h-4 w-4" />
        Asignar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar &quot;{routineName}&quot;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Atleta</Label>
            <Select value={athleteId} onValueChange={setAthleteId} items={athleteItems}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona atleta" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name || 'Sin nombre'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`started_at-${routineId}`}>Fecha de inicio</Label>
            <Input id={`started_at-${routineId}`} type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAssign} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Asignar rutina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

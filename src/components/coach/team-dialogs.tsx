'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createTeam, deleteTeam, setTeamMember } from '@/actions/teams'

export function CreateTeamDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await createTeam(name)
    setSaving(false)
    if (result.error || !result.teamId) {
      toast.error(result.error ?? 'No se pudo crear el team')
      return
    }
    setOpen(false)
    setName('')
    router.push(`/coach/teams/${result.teamId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo Team
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Crear team</DialogTitle>
            <DialogDescription>Después eliges qué alumnos lo forman.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="team-name">Nombre</Label>
            <Input id="team-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Equipo competición 2026" maxLength={60} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteTeam(teamId)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Team eliminado')
    router.push('/coach/teams')
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="text-destructive" />}>
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar team
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar &quot;{teamName}&quot;?</DialogTitle>
          <DialogDescription>Los alumnos no pierden sus datos; solo deja de existir el team y su ranking.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TeamMembersEditorProps {
  teamId: string
  athletes: { id: string; full_name: string | null }[]
  memberIds: string[]
}

export function TeamMembersEditor({ teamId, athletes, memberIds }: TeamMembersEditorProps) {
  const router = useRouter()
  const [members, setMembers] = useState(new Set(memberIds))
  const [pending, setPending] = useState<string | null>(null)

  async function toggle(athleteId: string, checked: boolean) {
    setPending(athleteId)
    const result = await setTeamMember(teamId, athleteId, checked)
    setPending(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setMembers(prev => {
      const next = new Set(prev)
      if (checked) next.add(athleteId)
      else next.delete(athleteId)
      return next
    })
    router.refresh()
  }

  if (athletes.length === 0) {
    return <p className="text-sm text-muted-foreground">Primero crea alumnos en la sección Alumnos.</p>
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {athletes.map(a => (
        <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted">
          <Checkbox
            checked={members.has(a.id)}
            onCheckedChange={checked => toggle(a.id, checked)}
            disabled={pending === a.id}
          />
          <span className="text-sm">{a.full_name || 'Sin nombre'}</span>
          {pending === a.id && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
        </label>
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { DeleteAccountDialog } from '@/components/layout/delete-account-dialog'

interface CoachAccountSectionProps {
  coachId: string
  fullName: string | null
  email: string | null
}

export function CoachAccountSection({ coachId, fullName, email }: CoachAccountSectionProps) {
  const [supabase] = useState(() => createClient())

  const [name, setName] = useState(fullName ?? '')
  const [savingName, setSavingName] = useState(false)

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) return toast.error('Poné tu nombre completo')
    setSavingName(true)
    const { error } = await supabase.from('profiles').update({ full_name: trimmed }).eq('id', coachId)
    setSavingName(false)
    if (error) return toast.error(`No se pudo guardar: ${error.message}`)
    toast.success('Nombre actualizado')
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (password !== repeat) return toast.error('Las contraseñas no coinciden')
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPassword(false)
    if (error) return toast.error(error.message)
    setPassword('')
    setRepeat('')
    toast.success('Contraseña actualizada')
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">Tu cuenta</h2>
      <div className="flex flex-col gap-6 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <form onSubmit={saveName} className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Nombre</Label>
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" />
            <Button type="submit" variant="outline" disabled={savingName || name.trim() === (fullName ?? '')}>
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </form>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Email</Label>
          <Input value={email ?? ''} readOnly disabled />
        </div>

        <form onSubmit={savePassword} className="space-y-3 border-t border-border pt-5">
          <p className="text-sm font-medium text-foreground">Cambiar contraseña</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Repetí la contraseña</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={repeat}
                onChange={e => setRepeat(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button type="submit" variant="outline" disabled={savingPassword || password === ''}>
            {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Actualizar contraseña
          </Button>
        </form>

        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Dar de baja mi cuenta
          </Button>
          <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
        </div>
      </div>
    </section>
  )
}

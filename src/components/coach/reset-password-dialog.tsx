'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { generatePassword, credentialsText } from '@/lib/password'

interface ResetPasswordDialogProps {
  athlete: { id: string; full_name: string | null } | null
  onClose: () => void
}

export function ResetPasswordDialog({ athlete, onClose }: ResetPasswordDialogProps) {
  // Remounted per athlete (key) so the password is fresh each time
  return athlete ? <ResetPasswordContent key={athlete.id} athlete={athlete} onClose={onClose} /> : null
}

function ResetPasswordContent({ athlete, onClose }: { athlete: { id: string; full_name: string | null }; onClose: () => void }) {
  const [password, setPassword] = useState(() => generatePassword())
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/athletes/${athlete.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setDone({ email: result.email, password: password.trim() })
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    if (!done) return
    await navigator.clipboard.writeText(credentialsText(done.email, done.password))
    setCopied(true)
    toast.success('Datos copiados')
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>Contraseña cambiada</DialogTitle>
              <DialogDescription>Pásale los nuevos datos a {athlete.full_name || 'tu alumno'}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1 rounded-lg border border-success/20 bg-success/5 p-4 text-sm">
              <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{done.email}</span></p>
              <p><span className="text-muted-foreground">Contraseña:</span> <span className="font-mono font-medium">{done.password}</span></p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copiar datos
              </Button>
              <Button onClick={onClose}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nueva contraseña para {athlete.full_name || 'tu alumno'}</DialogTitle>
              <DialogDescription>La anterior deja de funcionar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña</Label>
              <div className="flex gap-2">
                <Input id="new-password" className="font-mono" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} />
                <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generatePassword())} aria-label="Generar otra">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving || password.trim().length < 8}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cambiar contraseña
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

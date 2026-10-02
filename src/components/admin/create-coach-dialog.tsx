'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { generatePassword } from '@/lib/password'
import { PLANS, type PlanId } from '@/lib/contact'

const PLAN_LABELS: Record<PlanId, string> = {
  basic: PLANS.basic.label,
  pro: PLANS.pro.label,
}

interface CreateCoachDialogProps {
  children: React.ReactNode
  triggerClassName?: string
}

export function CreateCoachDialog({ children, triggerClassName }: CreateCoachDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState<PlanId>('basic')
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setFullName('')
      setEmail('')
      setPassword(generatePassword())
      setPlan('basic')
      setLimit(String(PLANS.basic.defaultLimit ?? ''))
      setCredentials(null)
      setCopied(false)
    }
  }

  function handlePlanChange(next: PlanId) {
    setPlan(next)
    setLimit(String(PLANS[next].defaultLimit ?? ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const student_limit = limit.trim() === '' ? null : Number(limit)
      const res = await fetch('/api/admin/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email.toLowerCase(),
          password,
          plan,
          student_limit,
        }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      setCredentials({ email: email.toLowerCase(), password })
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function copyCredentials() {
    if (!credentials) return
    const text = `Power Routine\nIngreso: ${window.location.origin}/login\nEmail: ${credentials.email}\nContraseña: ${credentials.password}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Datos copiados')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className={triggerClassName} />}>{children}</DialogTrigger>
      <DialogContent>
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle>Coach creado</DialogTitle>
              <DialogDescription>Pásale estos datos para que entre a la app.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-success/20 bg-success/5 p-4 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{credentials.email}</span></p>
              <p><span className="text-muted-foreground">Contraseña:</span> <span className="font-mono font-medium">{credentials.password}</span></p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copyCredentials}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copiar datos
              </Button>
              <Button onClick={() => setOpen(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nuevo coach</DialogTitle>
              <DialogDescription>Creas la cuenta y le pasas el email y la contraseña.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coach-name">Nombre completo</Label>
                <Input id="coach-name" placeholder="Juan Pérez" value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-email">Email</Label>
                <Input id="coach-email" type="email" placeholder="coach@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-password">Contraseña</Label>
                <div className="flex gap-2">
                  <Input id="coach-password" className="font-mono" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPassword(generatePassword())}
                    aria-label="Generar otra contraseña"
                    title="Generar otra contraseña"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={plan} onValueChange={v => v && handlePlanChange(v as PlanId)} items={PLAN_LABELS}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAN_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coach-limit">Límite de alumnos</Label>
                  <Input
                    id="coach-limit"
                    type="number"
                    min={0}
                    placeholder="Sin límite"
                    value={limit}
                    onChange={e => setLimit(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Crear coach
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

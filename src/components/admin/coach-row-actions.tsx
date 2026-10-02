'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Copy, KeyRound, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { generatePassword } from '@/lib/password'
import { PLANS, type PlanId } from '@/lib/contact'

const PLAN_LABELS: Record<PlanId, string> = {
  basic: PLANS.basic.label,
  pro: PLANS.pro.label,
}

interface Coach {
  id: string
  full_name: string | null
  email: string
  plan: 'basic' | 'pro'
  student_limit: number | null
  active: boolean
}

async function patchCoach(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/coaches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await res.json()
  if (result.error) throw new Error(result.error)
  return result
}

export function CoachRowActions({ coach, isSelf }: { coach: Coach; isSelf: boolean }) {
  const router = useRouter()
  const [limit, setLimit] = useState(coach.student_limit === null ? '' : String(coach.student_limit))
  const [savingLimit, setSavingLimit] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)

  async function handlePlanChange(next: PlanId) {
    setChangingPlan(true)
    try {
      const student_limit = PLANS[next].defaultLimit
      await patchCoach(coach.id, { plan: next, student_limit })
      setLimit(student_limit === null ? '' : String(student_limit))
      toast.success('Plan actualizado')
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setChangingPlan(false)
    }
  }

  async function handleSaveLimit() {
    setSavingLimit(true)
    try {
      const student_limit = limit.trim() === '' ? null : Number(limit)
      await patchCoach(coach.id, { student_limit })
      toast.success('Límite actualizado')
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSavingLimit(false)
    }
  }

  async function handleToggleActive(next: boolean) {
    setTogglingActive(true)
    try {
      await patchCoach(coach.id, { active: next })
      toast.success(next ? 'Coach activado' : 'Coach desactivado')
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setTogglingActive(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Select value={coach.plan} onValueChange={v => v && handlePlanChange(v as PlanId)} items={PLAN_LABELS}>
        <SelectTrigger size="sm" disabled={changingPlan}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PLAN_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          placeholder="Sin límite"
          value={limit}
          onChange={e => setLimit(e.target.value)}
          className="h-7 w-24"
        />
        <Button size="sm" variant="outline" onClick={handleSaveLimit} disabled={savingLimit}>
          {savingLimit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
        </Button>
      </div>

      <Switch
        checked={coach.active}
        onCheckedChange={handleToggleActive}
        disabled={isSelf || togglingActive}
        aria-label={coach.active ? 'Desactivar coach' : 'Activar coach'}
        title={isSelf ? 'No puedes desactivar tu propia cuenta' : undefined}
      />

      <ChangeCoachPasswordDialog coach={coach} />
    </div>
  )
}

function ChangeCoachPasswordDialog({ coach }: { coach: Coach }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setPassword(generatePassword())
      setDone(null)
      setCopied(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await patchCoach(coach.id, { password })
      setDone({ email: coach.email, password: password.trim() })
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    if (!done) return
    const text = `Power Routine\nIngreso: ${window.location.origin}/login\nEmail: ${done.email}\nContraseña: ${done.password}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Datos copiados')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="icon-sm" aria-label={`Cambiar contraseña de ${coach.full_name || 'coach'}`} title="Cambiar contraseña" />}>
        <KeyRound className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>Contraseña cambiada</DialogTitle>
              <DialogDescription>Pásale los nuevos datos a {coach.full_name || 'el coach'}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1 rounded-lg border bg-muted p-4 text-sm">
              <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{done.email}</span></p>
              <p><span className="text-muted-foreground">Contraseña:</span> <span className="font-mono font-medium">{done.password}</span></p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copiar datos
              </Button>
              <Button onClick={() => setOpen(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nueva contraseña para {coach.full_name || 'el coach'}</DialogTitle>
              <DialogDescription>La anterior deja de funcionar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-coach-password">Contraseña</Label>
              <div className="flex gap-2">
                <Input id="new-coach-password" className="font-mono" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} />
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

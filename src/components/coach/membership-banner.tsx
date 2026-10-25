'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Clock } from 'lucide-react'

interface MembershipBannerProps {
  periodEnd: string
}

export function MembershipBanner({ periodEnd }: MembershipBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const now = new Date()
  const end = new Date(periodEnd)
  const diffMs = end.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const graceDays = 5
  const daysPastDue = -daysLeft
  const graceRemaining = graceDays - daysPastDue

  useEffect(() => {
    if (daysLeft > 0) return
    try {
      const key = `membership-dismissed-${new Date().toISOString().slice(0, 10)}`
      if (localStorage.getItem(key) === '1') setDismissed(true)
    } catch {}
  }, [daysLeft])

  if (daysLeft > 0) return null
  if (dismissed) return null

  const blocked = graceRemaining <= 0

  function dismiss() {
    if (blocked) return
    setDismissed(true)
    try {
      localStorage.setItem(`membership-dismissed-${new Date().toISOString().slice(0, 10)}`, '1')
    } catch {}
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="mx-4 max-w-md rounded-2xl bg-card p-8 ring-1 ring-destructive/30 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Membresía vencida</h2>
          <p className="text-muted-foreground">
            Tu período de gracia de {graceDays} días terminó. Contactá al administrador para renovar tu membresía y seguir usando Power Routine.
          </p>
          <p className="text-sm text-muted-foreground">
            WhatsApp: <a href="https://wa.me/5491138753141" className="text-primary hover:underline">+54 9 11 3875-3141</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg bg-amber-500/10 px-4 py-3 text-sm ring-1 ring-amber-500/20">
      <Clock className="h-5 w-5 shrink-0 text-amber-500" />
      <span className="flex-1 text-foreground">
        <strong>Tu membresía venció.</strong>{' '}
        Tenés {graceRemaining} {graceRemaining === 1 ? 'día' : 'días'} para renovar. Contactá al administrador por WhatsApp.
      </span>
      <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" aria-label="Cerrar">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

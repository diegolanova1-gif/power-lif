'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const SESSION_KEY = 'pr-profile-prompt-dismissed'

// Aviso al ingresar mientras el alumno no haya completado su perfil.
// "Más tarde" lo oculta solo por esta sesión; vuelve a aparecer hasta que guarde el perfil.
export function ProfilePrompt({ variant }: { variant: 'renewed' | 'welcome' }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return sessionStorage.getItem(SESSION_KEY) !== '1'
    } catch {
      return true
    }
  })

  function dismiss() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* sin almacenamiento: solo se cierra */
    }
    setOpen(false)
  }

  if (pathname.startsWith('/athlete/profile')) return null

  return (
    <Dialog open={open} onOpenChange={next => !next && dismiss()}>
      <DialogContent className="max-w-sm">
        <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <UserRound className="h-6 w-6 text-foreground" />
        </div>
        <DialogTitle className="text-center">
          {variant === 'renewed' ? 'Renovamos la app web' : '¡Bienvenido a Power Routine!'}
        </DialogTitle>
        <DialogDescription className="text-center text-foreground">
          {variant === 'renewed'
            ? 'Mejoramos Power Routine para que tengas una mejor experiencia. Completá tu perfil con tus datos y lo que tu coach necesita saber para armarte la rutina y cuidarte.'
            : 'Completá tu perfil con tus datos y lo que tu coach necesita saber para armarte la rutina y cuidarte.'}
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-2">
          <Button nativeButton={false} render={<Link href="/athlete/profile" onClick={dismiss} />} className="h-11 w-full text-base">
            Completar mi perfil
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>
            Más tarde
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

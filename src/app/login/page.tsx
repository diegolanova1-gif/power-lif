'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, Lock, AlertCircle, ArrowLeft, Dumbbell, User, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { whatsappLink, WHATSAPP_MESSAGES } from '@/lib/contact'

const loginTheme = {
  background: 'radial-gradient(ellipse at 50% 50%, #15142a 0%, #0b0b0f 60%) fixed, #0b0b0f',
  '--background': '#0b0b0f',
  '--foreground': '#f4f4f5',
  '--card': '#16161b',
  '--card-foreground': '#f4f4f5',
  '--primary': '#6360ff',
  '--primary-foreground': '#ffffff',
  '--muted': '#1e1e26',
  '--muted-foreground': '#a1a1aa',
  '--border': 'rgba(255,255,255,0.08)',
  '--input': 'rgba(255,255,255,0.15)',
  '--ring': '#a5a3ff',
  '--destructive': '#ef4444',
  '--accent': '#1e1e26',
  '--accent-foreground': '#f4f4f5',
  '--secondary': '#1e1e26',
  '--secondary-foreground': '#f4f4f5',
  '--popover': '#16161b',
  '--popover-foreground': '#f4f4f5',
  '--success': '#22c55e',
} as React.CSSProperties

export default function LoginPage({ searchParams }: { searchParams: Promise<{ as?: string; error?: string }> }) {
  const params = use(searchParams)
  const isInactive = params.error === 'inactive'
  const [role, setRole] = useState<'coach' | 'alumno' | null>(
    params.as === 'alumno' ? 'alumno' : params.as === 'coach' ? 'coach' : null
  )
  const isAthlete = role === 'alumno'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Pasted credentials often carry stray spaces; mobile keyboards may capitalize the email
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    })

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? isAthlete
            ? 'Email o contraseña incorrectos. Si no recuerdas la contraseña, pídele a tu coach una nueva.'
            : 'Email o contraseña incorrectos.'
          : error.message
      )
    } else {
      toast.success('¡Bienvenido!')
      // Home redirects each role to its panel
      const redirectTo = new URLSearchParams(window.location.search).get('redirectTo')
      window.location.href = redirectTo?.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/'
      return
    }
    setLoading(false)
  }


  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={loginTheme}>
        <Card className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-[0_0_80px_rgba(99,96,255,0.12)]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-[0_8px_30px_rgba(99,96,255,0.4)]">
              <Dumbbell className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Power Routine</CardTitle>
            <CardDescription>¿Cómo querés ingresar?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isInactive && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Tu cuenta está desactivada. Contacta al administrador.</span>
              </div>
            )}
            <Button type="button" size="lg" className="w-full justify-start gap-3 shadow-[0_10px_40px_rgba(99,96,255,0.3)]" onClick={() => setRole('coach')}>
              <Dumbbell className="h-5 w-5" />
              Soy coach
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setRole('alumno')}
            >
              <User className="h-5 w-5" />
              Soy alumno
            </Button>
          </CardContent>
          <CardFooter className="justify-center !bg-transparent !border-t-0 pt-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Tus datos y los de tus alumnos, protegidos
            </p>
          </CardFooter>
        </Card>
        <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
          <Link href="/terminos" className="hover:text-foreground transition-colors">Términos</Link>
          <span>·</span>
          <Link href="/privacidad" className="hover:text-foreground transition-colors">Privacidad</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={loginTheme}>
      <Card className="w-full max-w-md relative animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-[0_0_80px_rgba(99,96,255,0.12)]">
        <CardHeader className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute left-2 top-2 text-muted-foreground"
            onClick={() => setRole(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-[0_8px_30px_rgba(99,96,255,0.4)]">
            <Dumbbell className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">Power Routine</CardTitle>
          <CardDescription>{isAthlete ? 'Ingreso de alumnos' : 'Ingreso de coaches'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInactive && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Tu cuenta está desactivada. Contacta al administrador.</span>
            </div>
          )}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full shadow-[0_10px_40px_rgba(99,96,255,0.3)]" disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          {isAthlete ? (
            <p className="text-center text-sm text-muted-foreground">
              Tu coach te da el email y la contraseña para entrar.
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              ¿Eres entrenador y quieres usar Power Routine?{' '}
              <a
                href={whatsappLink(WHATSAPP_MESSAGES.info)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Escríbenos por WhatsApp
              </a>
            </p>
          )}
        </CardContent>
      </Card>
      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
        <Link href="/terminos" className="hover:text-foreground transition-colors">Términos</Link>
        <span>·</span>
        <Link href="/privacidad" className="hover:text-foreground transition-colors">Privacidad</Link>
      </div>
    </div>
  )
}
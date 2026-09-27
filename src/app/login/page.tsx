'use client'

import { use, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Mail, Lock, AlertCircle, ArrowLeft, Dumbbell, User } from 'lucide-react'
import { toast } from 'sonner'
import { whatsappLink, WHATSAPP_MESSAGES } from '@/lib/contact'

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
  const [isMagicLink, setIsMagicLink] = useState(false)

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

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Revisa tu email para el enlace mágico')
    }
    setLoading(false)
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Power Routine</CardTitle>
            <CardDescription>¿Cómo querés ingresar?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isInactive && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Tu cuenta está desactivada. Contacta al administrador.</span>
              </div>
            )}
            <Button type="button" size="lg" className="w-full justify-start gap-3" onClick={() => setRole('coach')}>
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
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute left-2 top-2 text-gray-400"
            onClick={() => setRole(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Power Routine</CardTitle>
          <CardDescription>{isAthlete ? 'Ingreso de alumnos' : 'Ingreso de coaches'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInactive && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Tu cuenta está desactivada. Contacta al administrador.</span>
            </div>
          )}
          <form onSubmit={isMagicLink ? handleMagicLink : handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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

            {!isMagicLink && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
            )}

            {isMagicLink && (
              <p className="text-sm text-gray-500 text-center">
                Te enviaremos un enlace mágico a {email}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isMagicLink ? 'Enviando...' : 'Iniciando sesión...'}
                </>
              ) : isMagicLink ? (
                'Enviar enlace mágico'
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <Separator className="my-4" />

          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsMagicLink(!isMagicLink)}>
              {isMagicLink ? 'Usar contraseña' : 'Usar enlace mágico'}
            </Button>
          </div>

          {isAthlete ? (
            <p className="text-center text-sm text-gray-500">
              Tu coach te da el email y la contraseña para entrar.
            </p>
          ) : (
            <p className="text-center text-sm text-gray-500">
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
    </div>
  )
}
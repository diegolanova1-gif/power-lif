'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Default Supabase invite email (no custom template/SMTP) redirects here with
// the session in the URL hash (#access_token=...), which only the browser can read.
export default function AuthConfirmPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function confirm() {
      const params = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError(params.get('error_description') ?? 'El enlace es inválido o ya fue usado.')
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error || !data.user) {
        setError(error?.message ?? 'No se pudo iniciar sesión.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      window.location.replace(profile?.role === 'athlete' ? '/athlete' : '/coach')
    }

    confirm()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/[0.06] via-background to-background px-4">
      {error ? (
        <div className="text-center space-y-3">
          <p className="text-destructive">{error}</p>
          <Link href="/login" className="text-sm text-muted-foreground underline">
            Ir al login
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Activando tu cuenta...
        </div>
      )}
    </div>
  )
}

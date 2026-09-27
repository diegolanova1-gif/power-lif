import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  // Cookies are collected here and copied onto whichever redirect we return
  const cookiesToSet: { name: string; value: string; options: object }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  // code → OAuth / magic link / signup confirm (PKCE)
  // token_hash + type → invite email template (see README)
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Missing auth params') }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  let destination = next?.startsWith('/') ? next : null

  if (!destination) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
      ? await supabase.from('profiles').select('role').eq('id', user.id).single()
      : { data: null }
    destination = profile?.role === 'athlete' ? '/athlete' : '/coach'
  }

  const response = NextResponse.redirect(`${origin}${destination}`)
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}

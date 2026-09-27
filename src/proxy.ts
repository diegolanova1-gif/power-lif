import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname === '/'
  ) {
    return supabaseResponse
  }

  // Protected routes - redirect to login if no user
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Check user role for coach/athlete/admin routes
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin, active')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Accounts deactivated by the admin are signed out
  if (profile && !profile.active) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = '?error=inactive'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
    return response
  }

  if (pathname.startsWith('/admin') && !profile?.is_admin) {
    const url = request.nextUrl.clone()
    url.pathname = role === 'athlete' ? '/athlete' : '/coach'
    return NextResponse.redirect(url)
  }

  // Coach routes
  if (pathname.startsWith('/coach') && role !== 'coach') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'athlete' ? '/athlete' : '/login'
    return NextResponse.redirect(url)
  }

  // Athlete routes
  if (pathname.startsWith('/athlete') && role !== 'athlete') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'coach' ? '/coach' : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dumbbell, BarChart, History, LayoutDashboard, User, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutItem } from '@/components/layout/sign-out-item'
import { FabMenu } from '@/components/layout/fab-menu'
import { OneTimeNotice } from '@/components/athlete/one-time-notice'

// Nota puntual para una sola alumna — no es un sistema de anuncios general.
// Se guarda en athlete_notices así no vuelve a aparecer, ni a ella ni (por
// el chequeo de athleteId) a nadie más.
const PERSONAL_NOTICE = {
  athleteId: '609facc9-14a2-4277-8dc1-64a838d589ae',
  key: 'diego-2026-10',
  title: 'Un mensaje para vos',
  message: 'Te amo un montón, gracias por ser tan hermosa persona conmigo.\n\nTe amo,\nDiego',
}

export default async function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'athlete') {
    redirect('/coach')
  }

  // Bail out immediately for everyone except the one athlete it's for —
  // the query (and the message text) never run/reach anyone else.
  let showPersonalNotice = false
  if (user.id === PERSONAL_NOTICE.athleteId) {
    const { data: dismissed } = await supabase
      .from('athlete_notices')
      .select('athlete_id')
      .eq('athlete_id', user.id)
      .eq('notice_key', PERSONAL_NOTICE.key)
      .maybeSingle()
    showPersonalNotice = !dismissed
  }

  const navigation = [
    { name: 'Hoy', href: '/athlete', icon: LayoutDashboard },
    { name: 'Registrar', href: '/athlete/log', icon: Dumbbell },
    { name: 'Progreso', href: '/athlete/progress', icon: BarChart },
    { name: 'Historial', href: '/athlete/history', icon: History },
    { name: 'Team', href: '/athlete/team', icon: Trophy },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href="/athlete"
                className="absolute left-1/2 -translate-x-1/2 text-xl font-extrabold tracking-tight text-foreground md:static md:left-auto md:translate-x-0"
              >
                Power Routine
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
                    <AvatarFallback>{profile.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">Atleta</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/athlete" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Entrenamiento de hoy
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/athlete/log" className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4" />
                      Registrar series
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/athlete/progress" className="flex items-center gap-2">
                      <BarChart className="h-4 w-4" />
                      Mi progreso
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/athlete/history" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historial
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/athlete/team" className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Mi Team
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <SignOutItem />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      {/* pb-24 keeps content clear of the fixed dumbbell FAB (h-14 at bottom-6, ~80px footprint) */}
      <main className="mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
        {children}
      </main>
      <FabMenu
        items={navigation.map(item => ({
          name: item.name,
          href: item.href,
          icon: <item.icon className="h-5 w-5" />,
        }))}
      />
      {showPersonalNotice && (
        <OneTimeNotice
          athleteId={PERSONAL_NOTICE.athleteId}
          noticeKey={PERSONAL_NOTICE.key}
          title={PERSONAL_NOTICE.title}
          message={PERSONAL_NOTICE.message}
        />
      )}
    </div>
  )
}
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutDashboard, Users, FileText, BarChart, User, Settings, MessageSquare, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutItem } from '@/components/layout/sign-out-item'

export default async function DashboardLayout({
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

  if (!profile || profile.role !== 'coach') {
    redirect('/athlete')
  }

  // RLS scopes this to the coach's athletes
  const { count: pendingReviews } = await supabase
    .from('exercise_feedback')
    .select('id', { count: 'exact', head: true })
    .is('reviewed_at', null)

  const navigation = [
    { name: 'Dashboard', href: '/coach', icon: LayoutDashboard },
    { name: 'Alumnos', href: '/coach/athletes', icon: Users },
    { name: 'Rutinas', href: '/coach/routines', icon: FileText },
    { name: 'Analytics', href: '/coach/analytics', icon: BarChart },
    { name: 'Revisiones', href: '/coach/reviews', icon: MessageSquare, badge: pendingReviews ?? 0 },
    { name: 'Teams', href: '/coach/teams', icon: Trophy },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/coach" className="text-xl font-bold text-gray-900">
                Powerlifting Coach
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                    {'badge' in item && item.badge > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{item.badge}</span>
                    )}
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
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/coach" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/coach/athletes" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Mis Alumnos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/coach/routines" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Mis Rutinas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/coach/analytics" className="flex items-center gap-2">
                      <BarChart className="h-4 w-4" />
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/coach/reviews" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Revisiones{pendingReviews ? ` (${pendingReviews})` : ''}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/coach/teams" className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Teams
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
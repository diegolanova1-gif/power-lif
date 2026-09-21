import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, Dumbbell, BarChart, History, LayoutDashboard, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const navigation = [
    { name: 'Hoy', href: '/athlete', icon: LayoutDashboard },
    { name: 'Registrar', href: '/athlete/log', icon: Dumbbell },
    { name: 'Progreso', href: '/athlete/progress', icon: BarChart },
    { name: 'Historial', href: '/athlete/history', icon: History },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/athlete" className="text-xl font-bold text-gray-900">
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
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
                      <AvatarFallback>{profile.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">Atleta</p>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
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
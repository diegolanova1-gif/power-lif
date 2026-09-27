import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function Home() {
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

  // If authenticated, redirect to appropriate dashboard
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'coach') {
      redirect('/coach')
    } else if (profile?.role === 'athlete') {
      redirect('/athlete')
    }
    // If no profile yet, let them see landing to complete setup
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Powerlifting Coach</h1>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/register">
              <Button>Registrarse</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Rutinas a medida para <span className="text-primary">cada alumno</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
            Para entrenadores de gimnasio, fuerza e hipertrofia: armas la rutina de cada alumno semana a semana,
            ellos registran lo que hicieron desde el celular y tú ves su progreso.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto text-left">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">Soy Coach</h3>
              <p className="mt-2 text-gray-600">Crea rutinas, gestiona tus alumnos y sigue sus estadísticas.</p>
              <div className="mt-6 flex gap-2">
                <Button nativeButton={false} render={<Link href="/login" />}>Ingresar</Button>
                <Button variant="outline" nativeButton={false} render={<Link href="/register" />}>Crear cuenta</Button>
              </div>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">Soy Alumno</h3>
              <p className="mt-2 text-gray-600">Entra con el email y la contraseña que te dio tu coach.</p>
              <div className="mt-6">
                <Button nativeButton={false} render={<Link href="/login?as=alumno" />}>Ingresar como alumno</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="Users"
              title="Tus alumnos"
              description="Creas la cuenta de cada alumno en segundos y le pasas su usuario y contraseña."
            />
            <FeatureCard
              icon="FileText"
              title="Rutinas a medida"
              description="Desde cero o con modelos listos: días, ejercicios, series, reps y cargas, semana a semana."
            />
            <FeatureCard
              icon="Smartphone"
              title="El alumno registra"
              description="Marca cada ejercicio como hecho o anota lo que pudo hacer, y te deja comentarios y videos."
            />
            <FeatureCard
              icon="Shield"
              title="Seguimiento"
              description="Ves lo que indicaste contra lo que hizo, sesión por sesión, y le respondes."
            />
            <FeatureCard
              icon="BarChart"
              title="Estadísticas"
              description="1RM estimado, volumen y adherencia de cada alumno."
            />
            <FeatureCard
              icon="Zap"
              title="Teams y ranking"
              description="Agrupa alumnos para que comparen su progreso y compitan en un ranking."
            />
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-gray-500 text-sm">
          Powerlifting Coach · Hecho para entrenadores
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: IconName, title, description }: { icon: string; title: string; description: string }) {
  const icons: Record<string, React.ReactNode> = {
    Users: <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    FileText: <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    BarChart: <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    Smartphone: <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Shield: <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    Zap: <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-primary mb-4">{icons[IconName]}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
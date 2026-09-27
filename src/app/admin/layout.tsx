import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminUserId } from '@/lib/auth/admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminId = await getAdminUserId()
  if (!adminId) {
    redirect('/coach')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <span className="text-xl font-bold text-gray-900">Power Routine · Admin</span>
            <Link href="/coach" className="text-sm font-medium text-gray-500 hover:text-gray-900">
              Volver a mi panel
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

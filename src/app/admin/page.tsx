import { UserPlus, Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUserId } from '@/lib/auth/admin'
import { PLANS } from '@/lib/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CreateCoachDialog } from '@/components/admin/create-coach-dialog'
import { CoachRowActions } from '@/components/admin/coach-row-actions'

interface CoachRow {
  id: string
  full_name: string | null
  email: string
  plan: 'basic' | 'pro'
  student_limit: number | null
  active: boolean
  is_admin: boolean
  created_at: string
  athleteCount: number
}

export default async function AdminPage() {
  const adminId = await getAdminUserId()
  // Layout and page render in parallel: guard here too before using the service role
  if (!adminId) redirect('/coach')
  const admin = createAdminClient()

  const { data: coaches } = await admin
    .from('profiles')
    .select('id, full_name, email, plan, student_limit, active, is_admin, created_at')
    .eq('role', 'coach')
    .order('created_at', { ascending: false })

  const coachIds = coaches?.map(c => c.id) ?? []
  let counts = new Map<string, number>()
  if (coachIds.length > 0) {
    const { data: links } = await admin
      .from('coach_athletes')
      .select('coach_id')
      .in('coach_id', coachIds)
    counts = (links ?? []).reduce((map, row) => {
      map.set(row.coach_id, (map.get(row.coach_id) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  }

  const rows: CoachRow[] = (coaches ?? []).map(c => ({
    ...c,
    plan: c.plan as 'basic' | 'pro',
    athleteCount: counts.get(c.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coaches</h1>
          <p className="text-gray-500 mt-1">Alta de coaches, planes y límite de alumnos</p>
        </div>
        <CreateCoachDialog>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo coach
        </CreateCoachDialog>
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No hay coaches todavía</p>
              <CreateCoachDialog triggerClassName="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                Crear el primero
              </CreateCoachDialog>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Alumnos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(coach => (
                    <TableRow key={coach.id}>
                      <TableCell className="font-medium">{coach.full_name || 'Sin nombre'}</TableCell>
                      <TableCell>{coach.email}</TableCell>
                      <TableCell>{PLANS[coach.plan].label}</TableCell>
                      <TableCell>
                        {coach.student_limit === null
                          ? `${coach.athleteCount} · sin límite`
                          : `${coach.athleteCount} / ${coach.student_limit}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coach.active ? 'default' : 'destructive'}>
                          {coach.active ? 'Activo' : 'Desactivado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <CoachRowActions coach={coach} isSelf={coach.id === adminId} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

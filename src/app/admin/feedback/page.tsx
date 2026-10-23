import { redirect } from 'next/navigation'
import { getAdminUserId } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackRowActions } from '@/components/admin/feedback-row-actions'

const TYPE_LABEL: Record<string, string> = {
  suggestion: 'Sugerencia',
  bug: 'Error',
  feature: 'Nueva función',
  error: 'Error',
  other: 'Otro',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'secondary'> = {
  pending: 'default',
  reviewed: 'secondary',
  resolved: 'success',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  resolved: 'Resuelto',
}

export default async function AdminFeedbackPage() {
  const adminId = await getAdminUserId()
  if (!adminId) redirect('/coach')
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('user_feedback')
    .select('id, user_id, type, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const userIds = [...new Set((rows ?? []).map(r => r.user_id as string))]
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, full_name, role').in('id', userIds)
    : { data: [] }
  const profileMap = new Map((profiles ?? []).map(p => [p.id as string, p]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Feedback</h1>
        <p className="text-muted-foreground mt-1">Sugerencias y reportes de coaches y alumnos</p>
      </div>

      <Card>
        <CardContent>
          {(rows ?? []).length === 0 ? (
            <div className="text-center py-12">
              <MessageSquarePlus className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No hay feedback todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="min-w-[300px]">Mensaje</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows ?? []).map(row => {
                    const profile = profileMap.get(row.user_id as string)
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{profile?.full_name || 'Sin nombre'}</TableCell>
                        <TableCell className="capitalize">{profile?.role || '—'}</TableCell>
                        <TableCell>{TYPE_LABEL[row.type as string] || row.type}</TableCell>
                        <TableCell className="max-w-[400px] whitespace-pre-wrap break-words text-sm">{row.message}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[row.status as string] || 'default'}>
                            {STATUS_LABEL[row.status as string] || row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(row.created_at as string).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <FeedbackRowActions id={row.id as string} currentStatus={row.status as string} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUserId } from '@/lib/auth/admin'
import { updateCoachSchema } from '@/lib/validations/admin'

// Admin changes a coach's plan, student limit, active flag or password
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await getAdminUserId()
    if (!adminId) {
      return NextResponse.json({ error: 'Solo el administrador puede editar coaches' }, { status: 403 })
    }

    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const validation = updateCoachSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { password, ...fields } = validation.data

    if (id === adminId && fields.active === false) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: target } = await admin.from('profiles').select('role').eq('id', id).maybeSingle()
    if (target?.role !== 'coach') {
      return NextResponse.json({ error: 'Coach no encontrado' }, { status: 404 })
    }

    if (Object.keys(fields).length > 0) {
      const { error } = await admin.from('profiles').update(fields).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (password) {
      const { error } = await admin.auth.admin.updateUserById(id, { password })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/admin/coaches/[id]:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

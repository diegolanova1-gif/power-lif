import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resetPasswordSchema } from '@/lib/validations/athlete'

// Coach sets a new password for one of THEIR athletes (forgotten / mistyped credentials)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: athleteId } = await params
    if (!z.string().uuid().safeParse(athleteId).success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // RLS on coach_athletes: only returns the row if this coach owns the link
    const { data: link } = await supabase
      .from('coach_athletes')
      .select('athlete_id')
      .eq('coach_id', user.id)
      .eq('athlete_id', athleteId)
      .maybeSingle()
    if (!link) {
      return NextResponse.json({ error: 'Alumno no encontrado o sin permisos' }, { status: 403 })
    }

    const validation = resetPasswordSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: target } = await admin.from('profiles').select('role').eq('id', athleteId).maybeSingle()
    if (target?.role !== 'athlete') {
      return NextResponse.json({ error: 'Solo se puede cambiar la contraseña de alumnos' }, { status: 403 })
    }

    const { data, error } = await admin.auth.admin.updateUserById(athleteId, { password: validation.data.password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, email: data.user.email })
  } catch (error) {
    console.error('Error in POST /api/coach/athletes/[id]/password:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

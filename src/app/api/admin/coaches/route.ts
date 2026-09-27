import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUserId } from '@/lib/auth/admin'
import { createCoachSchema } from '@/lib/validations/admin'

// Admin creates a coach account (no public sign-up)
export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminUserId())) {
      return NextResponse.json({ error: 'Solo el administrador puede crear coaches' }, { status: 403 })
    }

    const validation = createCoachSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { full_name, password, plan, student_limit } = validation.data
    const email = validation.data.email.toLowerCase()

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'coach' },
    })
    if (error) {
      const message = /already|registered|exists/i.test(error.message) ? 'Ya existe una cuenta con ese email' : error.message
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Profile row is created by the signup trigger; set the plan on it
    const { error: planError } = await admin
      .from('profiles')
      .update({ plan, student_limit })
      .eq('id', data.user.id)
    if (planError) {
      return NextResponse.json({ error: `Cuenta creada, pero no se pudo asignar el plan: ${planError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, coachId: data.user.id })
  } catch (error) {
    console.error('Error in POST /api/admin/coaches:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

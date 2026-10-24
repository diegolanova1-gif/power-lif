import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { password } = await request.json()
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    }

    // Verify password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })
    if (authError) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const deletedName = profile.full_name || profile.email || user.email
    const deletedRole = profile.role

    if (deletedRole === 'athlete') {
      // Find coach and notify
      const { data: link } = await admin
        .from('coach_athletes')
        .select('coach_id')
        .eq('athlete_id', user.id)
        .maybeSingle()

      if (link) {
        await admin.from('account_deletions').insert({
          deleted_user_name: deletedName,
          deleted_user_role: deletedRole,
          notify_user_id: link.coach_id,
          deleted_at: new Date().toISOString(),
        })
      }
    } else if (deletedRole === 'coach') {
      // Find admin and notify
      const { data: admins } = await admin
        .from('profiles')
        .select('id')
        .eq('is_admin', true)
        .limit(1)

      if (admins && admins.length > 0) {
        await admin.from('account_deletions').insert({
          deleted_user_name: deletedName,
          deleted_user_role: deletedRole,
          notify_user_id: admins[0].id,
          deleted_at: new Date().toISOString(),
        })
      }
    }

    // Delete the user (cascades through Supabase auth + DB foreign keys)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return NextResponse.json({ error: `No se pudo eliminar la cuenta: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/account/delete:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

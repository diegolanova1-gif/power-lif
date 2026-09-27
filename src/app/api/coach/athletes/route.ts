import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAthleteSchema } from '@/lib/validations/athlete'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: coach } = await supabase
      .from('profiles')
      .select('role, student_limit, active')
      .eq('id', user.id)
      .single()
    if (coach?.role !== 'coach' || !coach.active) {
      return NextResponse.json({ error: 'Solo coaches activos pueden crear alumnos' }, { status: 403 })
    }

    const validation = createAthleteSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const email = validation.data.email.toLowerCase()
    const { full_name, password } = validation.data

    const admin = createAdminClient()

    // Existing account → link it (only if it's an athlete)
    const { data: existing } = await admin
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()

    let athleteId: string
    let created = false

    const { data: alreadyLinked } = existing
      ? await admin.from('coach_athletes').select('athlete_id').eq('coach_id', user.id).eq('athlete_id', existing.id).maybeSingle()
      : { data: null }

    // Plan limit, checked before creating any account (the DB trigger enforces it too)
    if (!alreadyLinked && coach.student_limit !== null) {
      const { count } = await admin
        .from('coach_athletes')
        .select('athlete_id', { count: 'exact', head: true })
        .eq('coach_id', user.id)
      if ((count ?? 0) >= coach.student_limit) {
        return NextResponse.json(
          { error: `Llegaste al límite de tu plan (${coach.student_limit} alumnos).`, code: 'STUDENT_LIMIT' },
          { status: 403 }
        )
      }
    }

    if (existing) {
      if (existing.role !== 'athlete') {
        return NextResponse.json({ error: 'Ese email pertenece a una cuenta de coach' }, { status: 409 })
      }
      athleteId = existing.id
    } else {
      // Coach sets the password and hands it to the athlete: no email needed
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: 'athlete' },
      })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      athleteId = data.user.id
      created = true
    }

    const { error: linkError } = await admin
      .from('coach_athletes')
      .upsert({ coach_id: user.id, athlete_id: athleteId }, { onConflict: 'coach_id,athlete_id', ignoreDuplicates: true })
    if (linkError) {
      if (linkError.message.includes('STUDENT_LIMIT_REACHED')) {
        return NextResponse.json({ error: 'Llegaste al límite de alumnos de tu plan.', code: 'STUDENT_LIMIT' }, { status: 403 })
      }
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, created, athleteId })
  } catch (error: any) {
    console.error('Error in POST /api/coach/athletes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

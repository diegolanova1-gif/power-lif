// Datos demo para capturas de la landing.
// Crea 1 coach + 8 alumnos (emails pr-demo-*@example.com) con 6 semanas de historia.
// Uso: node scripts/demo/seed.mjs <password>   (borra y recrea todo lo demo)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')])
)
const PASSWORD = process.argv[2]
if (!PASSWORD) throw new Error('Falta la contraseña: node scripts/demo/seed.mjs <password>')

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PREFIX = 'pr-demo-'
const DOMAIN = '@example.com'

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

// PRNG determinístico: mismos datos en cada corrida
let seed = 42
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

// ---------- limpieza ----------
export async function cleanup() {
  const users = []
  for (let page = 1; ; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  const demo = users.filter(u => u.email?.startsWith(PREFIX) && u.email.endsWith(DOMAIN))
  const coach = demo.find(u => u.email === `${PREFIX}coach${DOMAIN}`)
  if (coach) {
    must(await db.from('teams').delete().eq('coach_id', coach.id), 'borrar teams')
    must(await db.from('routines').delete().eq('coach_id', coach.id), 'borrar rutinas')
  }
  for (const u of demo) must(await db.auth.admin.deleteUser(u.id), `borrar ${u.email}`)
  return demo.length
}

// ---------- datos ----------
const COACH = { key: 'coach', name: 'Martín Ríos' }
// start: semana calendario en que arrancó (1 = 31/08). stopAfter: sesiones hechas en la última semana (null = todas)
const ATHLETES = [
  { key: 'sofia', name: 'Sofía Benítez', sex: 'F', bw: 63, h: 165, S: 85, B: 50, D: 110, start: 1, stopAfter: null, partialToday: 2, exp: 'intermedio', goal: 'Competir en el próximo torneo amateur de powerlifting.' },
  { key: 'tomas', name: 'Tomás Acuña', sex: 'M', bw: 84, h: 178, S: 140, B: 100, D: 175, start: 1, stopAfter: null, exp: 'avanzado', goal: 'Pasar los 500 kg de total.' },
  { key: 'lucia', name: 'Lucía Ferreyra', sex: 'F', bw: 58, h: 160, S: 70, B: 42.5, D: 95, start: 2, stopAfter: null, exp: 'intermedio', goal: 'Mejorar técnica de sentadilla y ganar fuerza.' },
  { key: 'mateo', name: 'Mateo Giménez', sex: 'M', bw: 92, h: 183, S: 160, B: 115, D: 190, start: 1, stopAfter: null, exp: 'avanzado', goal: 'Banca de 130 kg antes de fin de año.' },
  { key: 'valentina', name: 'Valentina Ruiz', sex: 'F', bw: 70, h: 170, S: 90, B: 52.5, D: 120, start: 3, stopAfter: 3, exp: 'intermedio', goal: 'Fuerza general y constancia.' },
  { key: 'joaquin', name: 'Joaquín Paz', sex: 'M', bw: 76, h: 175, S: 110, B: 80, D: 140, start: 2, stopAfter: 1, exp: 'intermedio', goal: 'Volver a entrenar fuerza después de una lesión de hombro.' },
  { key: 'camila', name: 'Camila Sosa', sex: 'F', bw: 55, h: 158, S: 55, B: 32.5, D: 75, start: 4, stopAfter: null, exp: 'principiante', goal: 'Aprender los tres básicos con buena técnica.' },
  { key: 'nicolas', name: 'Nicolás Herrera', sex: 'M', bw: 88, h: 180, S: 130, B: 92.5, D: 165, start: 1, stopAfter: 2, exp: 'intermedio', goal: 'Subir de peso corporal ganando fuerza.' },
]

const DAYS = [1, 3, 5, 7] // Lunes, Miércoles, Viernes, Domingo
const WEEKS = 8
const START_MONDAY = new Date('2026-08-31T00:00:00-03:00')
const CURRENT_CAL_WEEK = 6 // semana del 05/10 (hoy 11/10)

const r25 = kg => Math.round(kg / 2.5) * 2.5

// Prescripción por semana (progresión lineal)
function dayPlan(ex, a, week) {
  const k = 1
  const acc = base => r25(base * (1 + 0.05 * Math.floor((week - 1) / 2)) * k)
  const prog = (base, step) => r25(base + step * (week - 1))
  return [
    {
      day: 1, name: 'Sentadilla pesada',
      exercises: [
        { id: ex['Sentadilla'], sets: 4, reps: 5, kg: prog(a.S, 2.5), rpe: 8, rest: 180, note: 'Bajá controlado, 1 seg abajo. Rodillas afuera.' },
        { id: ex['Press de Banca'], sets: 3, reps: 8, kg: prog(a.B * 0.8, 1.25), rpe: 7, rest: 120 },
        { id: ex['Remo con Barra'], sets: 3, reps: 10, kg: acc(a.B * 0.7), rest: 90 },
        { id: ex['Curl Femoral'], sets: 3, reps: 12, kg: acc(a.bw * 0.4), rest: 60 },
      ],
    },
    {
      day: 3, name: 'Banca pesada',
      exercises: [
        { id: ex['Press de Banca'], sets: 4, reps: 5, kg: prog(a.B, 1.25), rpe: 8, rest: 180, note: 'Pausa de 1 seg en el pecho en todas las reps.' },
        { id: ex['Press Militar'], sets: 3, reps: 8, kg: acc(a.B * 0.55), rest: 120 },
        { id: ex['Dominadas'], sets: 3, reps: 6, reps_max: 8, kg: 0, rest: 120 },
        { id: ex['Extensiones de Tríceps'], sets: 3, reps: 12, kg: acc(a.B * 0.25), rest: 60 },
      ],
    },
    {
      day: 5, name: 'Peso muerto',
      exercises: [
        { id: ex['Peso Muerto'], sets: 4, reps: 4, kg: prog(a.D, 5), rpe: 8, rest: 210, note: 'Tensión antes de despegar. Nada de tirones.' },
        { id: ex['Sentadilla con Pausa'], sets: 3, reps: 5, kg: r25(a.S * 0.7), rpe: 7, rest: 150 },
        { id: ex['Hip Thrust'], sets: 3, reps: 10, kg: acc(a.D * 0.6), rest: 90 },
        { id: ex['Face Pulls'], sets: 3, reps: 15, kg: 15, rest: 60 },
      ],
    },
    {
      day: 7, name: 'Volumen',
      exercises: [
        { id: ex['Press con Pausa'], sets: 4, reps: 4, kg: prog(a.B * 0.85, 1.25), rpe: 7, rest: 150 },
        { id: ex['Peso Muerto Rumano'], sets: 3, reps: 8, kg: acc(a.D * 0.55), rest: 120 },
        { id: ex['Jalón al Pecho'], sets: 3, reps: 10, kg: acc(a.bw * 0.6), rest: 90 },
        { id: ex['Elevaciones Laterales'], sets: 3, reps: 15, kg: a.sex === 'F' ? 5 : 8, rest: 60 },
      ],
    },
  ]
}

function toSchedule(plan) {
  return plan.map(d => ({
    day: d.day,
    name: d.name,
    exercises: d.exercises.map((e, i) => ({
      exercise_id: e.id,
      sets: e.sets,
      reps: e.reps,
      ...(e.reps_max ? { reps_max: e.reps_max } : {}),
      load_type: 'kg',
      load_value: e.kg,
      intensity: e.kg > 0 ? `${e.kg} kg` : 'Peso corporal',
      ...(e.rpe ? { rpe_target: e.rpe } : {}),
      rest_seconds: e.rest,
      ...(e.note ? { note: e.note } : {}),
      order: i,
    })),
  }))
}

function structureFor(ex, a) {
  return {
    name: 'Powerlifting · Bloque de fuerza',
    weeks: WEEKS,
    progression: 'linear',
    goal: 'powerlifting',
    schedule: toSchedule(dayPlan(ex, a, 1)),
    week_plans: Array.from({ length: WEEKS - 1 }, (_, i) => ({ week: i + 2, schedule: toSchedule(dayPlan(ex, a, i + 2)) })),
  }
}

function dateOf(calWeek, day, hour = 18, minute = 30) {
  const d = new Date(START_MONDAY)
  d.setDate(d.getDate() + (calWeek - 1) * 7 + (day - 1))
  const ymd = d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  return { ymd, at: (m = 0) => new Date(`${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`).getTime() + m * 60000 }
}

// Observaciones del alumno: [alumno, semana rutina, día, ejercicio, nota, motivo, respuesta coach | null]
const FEEDBACK = [
  ['sofia', 6, 1, 'Sentadilla', 'En las dos últimas series se me fue la rodilla izquierda para adentro. ¿Bajo el peso?', null, null],
  ['sofia', 5, 5, 'Peso Muerto', 'Salió muy rápido, RPE 7 en la última. Me sentí fuerte.', null, 'Excelente. La semana que viene subimos 5 kg, mantené la misma salida.'],
  ['tomas', 6, 5, 'Peso Muerto', 'Dormí 5 horas. La última serie fue RPE 10, la bajé a 3 reps.', 'fatigue', null],
  ['mateo', 6, 7, 'Press con Pausa', 'Me molestó el hombro derecho en la pausa, sobre todo en la 3ra y 4ta serie.', 'pain', null],
  ['lucia', 5, 3, 'Press de Banca', null, 'reps_incomplete', null],
  ['valentina', 4, 1, 'Sentadilla', 'Me sobraron 2-3 reps en todas las series. ¿Subo?', null, 'Sí, la semana que viene +2,5 kg. Mantené la profundidad.'],
  ['camila', 3, 3, 'Dominadas', 'Las hice con banda elástica, sin banda llego a 2.', 'other', null],
  ['nicolas', 6, 3, 'Press de Banca', 'Llegué a 3 reps en la última serie, la barra no subía.', 'reps_incomplete', null],
]

async function main() {
  console.log('Limpiando demo anterior:', await cleanup(), 'usuarios')

  const exRows = must(await db.from('exercises').select('id, name').is('created_by', null), 'ejercicios')
  const ex = {}
  for (const r of exRows) ex[r.name] ??= r.id
  const needed = ['Sentadilla', 'Press de Banca', 'Remo con Barra', 'Curl Femoral', 'Press Militar', 'Dominadas', 'Extensiones de Tríceps', 'Peso Muerto', 'Sentadilla con Pausa', 'Hip Thrust', 'Face Pulls', 'Press con Pausa', 'Peso Muerto Rumano', 'Jalón al Pecho', 'Elevaciones Laterales']
  const missing = needed.filter(n => !ex[n])
  if (missing.length) throw new Error(`Faltan ejercicios en el catálogo: ${missing.join(', ')}`)

  const createUser = async (key, name, role) => {
    const { user } = must(await db.auth.admin.createUser({
      email: `${PREFIX}${key}${DOMAIN}`, password: PASSWORD, email_confirm: true,
      user_metadata: { role, full_name: name },
    }), `crear ${key}`)
    return user.id
  }

  // Coach
  const coachId = await createUser(COACH.key, COACH.name, 'coach')
  must(await db.from('profiles').update({ plan: 'pro', student_limit: null, created_at: '2026-08-20T12:00:00-03:00' }).eq('id', coachId), 'plan coach')

  // Plantilla del coach (para la pantalla Rutinas)
  must(await db.from('routines').insert({
    coach_id: coachId, name: 'Powerlifting · Bloque de fuerza', description: '4 días · 8 semanas · progresión lineal',
    is_template: true, structure: structureFor(ex, { S: 100, B: 70, D: 130, bw: 75, sex: 'M' }),
  }), 'plantilla')

  const athleteIds = {}
  for (const a of ATHLETES) {
    const id = await createUser(a.key, a.name, 'athlete')
    athleteIds[a.key] = id
    const joined = dateOf(a.start, 1, 10).ymd
    must(await db.from('profiles').update({ created_at: `${joined}T10:00:00-03:00` }).eq('id', id), 'fecha alta')
    must(await db.from('coach_athletes').insert({ coach_id: coachId, athlete_id: id, assigned_at: `${joined}T10:00:00-03:00` }), 'vínculo')
    must(await db.from('athlete_profile').insert({
      athlete_id: id, sex: a.sex, height_cm: a.h, bodyweight_kg: a.bw, experience: a.exp, goal: a.goal, days_per_week: 4,
    }), 'perfil')

    const structure = structureFor(ex, a)
    const routine = must(await db.from('routines').insert({
      coach_id: coachId, name: `Bloque de fuerza · ${a.name.split(' ')[0]}`, is_template: false, structure,
    }).select('id').single(), 'rutina')
    const ar = must(await db.from('athlete_routines').insert({
      athlete_id: id, routine_id: routine.id, started_at: joined, assigned_at: `${joined}T10:00:00-03:00`,
    }).select('id').single(), 'asignación')

    // Sesiones: semana de rutina w = semana calendario - start + 1
    const shortfalls = FEEDBACK.filter(f => f[0] === a.key && f[5] && f[5] !== 'other')
    let sessions = 0
    const sessionDates = []
    for (let cal = a.start; cal <= CURRENT_CAL_WEEK; cal++) {
      const week = cal - a.start + 1
      const plan = dayPlan(ex, a, week)
      const daysThisWeek = cal === CURRENT_CAL_WEEK && a.stopAfter !== null ? DAYS.slice(0, a.stopAfter) : DAYS
      for (const day of daysThisWeek) {
        const today = cal === CURRENT_CAL_WEEK && day === 7
        const when = dateOf(cal, day, today ? 9 + Math.floor(rand() * 2) : 17 + Math.floor(rand() * 4), Math.floor(rand() * 4) * 15)
        const partial = today && a.partialToday
        const rows = []
        let minute = 0
        for (const e of plan.find(d => d.day === day).exercises.slice(0, partial || undefined)) {
          const short = shortfalls.some(f => f[1] === week && f[2] === day && ex[f[3]] === e.id)
          for (let s = 1; s <= e.sets; s++) {
            minute += 3 + Math.floor(rand() * 2)
            const last = s === e.sets
            const reps = short && last ? e.reps - (e.reps >= 5 ? 2 : 1) : e.reps_max ? e.reps + Math.floor(rand() * (e.reps_max - e.reps + 1)) : e.reps
            const rpe = e.rpe ? Math.min(9.5, e.rpe - 0.5 + (s - 1) * 0.5 + (short && last ? 1 : 0) + (rand() < 0.2 ? 0.5 : 0)) : null
            rows.push({
              athlete_id: id, athlete_routine_id: ar.id, exercise_id: e.id, week, day, set_number: s,
              weight_kg: e.kg, reps, rpe, completed_at: new Date(when.at(minute)).toISOString(),
            })
          }
        }
        must(await db.from('sets_log').insert(rows), `series ${a.key} s${week}d${day}`)
        if (!partial) sessionDates.push(when.at())
        sessions++
      }
    }
    console.log(`${a.name}: ${sessions} sesiones`)
    const CARDS = [1, 4, 7, 10, 14, 21, 30, 40, 50, 60]
    const unlocked = CARDS.map((req, i) => ({ req, n: i + 1 })).filter(c => c.req <= sessionDates.length)
    if (unlocked.length) must(await db.from('streak_achievements').insert(unlocked.map(c => ({
      athlete_id: id, milestone: `card_${String(c.n).padStart(3, '0')}`, unlocked_at: new Date(sessionDates[c.req - 1] + 90 * 60000).toISOString(),
    }))), 'logros')

    // Observaciones
    for (const [key, week, day, exName, note, reason, reply] of FEEDBACK.filter(f => f[0] === a.key)) {
      const cal = week + a.start - 1
      const created = new Date(dateOf(cal, day, cal === CURRENT_CAL_WEEK && day === 7 ? 11 : 20, 15).at()).toISOString()
      must(await db.from('exercise_feedback').insert({
        athlete_id: id, athlete_routine_id: ar.id, exercise_id: ex[exName], week, day, note, reason,
        coach_reply: reply, updated_at: created, reviewed_at: reply ? new Date(dateOf(cal, day, 22, 40).at()).toISOString() : null, created_at: created,
      }), `observación ${key}`)
    }
  }

  // Team + ranking aprobado de sentadilla (misma fórmula que actions/team-ranking.ts)
  const team = must(await db.from('teams').insert({ coach_id: coachId, name: 'Equipo Fuerza', lead_exercise_id: ex['Sentadilla'], created_at: '2026-09-01T12:00:00-03:00' }).select('id').single(), 'team')
  must(await db.from('team_members').insert(ATHLETES.map(a => ({ team_id: team.id, athlete_id: athleteIds[a.key] }))), 'miembros')

  const sets = must(await db.from('sets_log').select('athlete_id, weight_kg, reps, rpe, completed_at')
    .eq('exercise_id', ex['Sentadilla']).in('athlete_id', Object.values(athleteIds)).gt('reps', 0).gt('weight_kg', 0)
    .order('completed_at', { ascending: true }), 'sets ranking')
  const e1rm = (w, r, rpe) => { const eff = r + (rpe == null ? 0 : 10 - rpe); return eff <= 1 ? w : w * (1 + eff / 30) }
  const first = new Map(), best = new Map()
  for (const s of sets) {
    const v = e1rm(Number(s.weight_kg), s.reps, s.rpe == null ? null : Number(s.rpe))
    if (!first.has(s.athlete_id)) first.set(s.athlete_id, v)
    best.set(s.athlete_id, Math.max(best.get(s.athlete_id) ?? 0, v))
  }
  const round1 = n => Math.round(n * 10) / 10
  const norm = (v, mn, mx) => (mx === mn ? 100 : ((v - mn) / (mx - mn)) * 100)
  const data = ATHLETES.map(a => {
    const aid = athleteIds[a.key], cur = best.get(aid), fst = first.get(aid)
    return { aid, name: a.name, cur, fst, pct: ((cur - fst) / fst) * 100 }
  })
  const [cMin, cMax] = [Math.min(...data.map(d => d.cur)), Math.max(...data.map(d => d.cur))]
  const [pMin, pMax] = [Math.min(...data.map(d => d.pct)), Math.max(...data.map(d => d.pct))]
  const entries = data.map(d => {
    const cn = norm(d.cur, cMin, cMax), pn = norm(d.pct, pMin, pMax)
    return { athlete_id: d.aid, full_name: d.name, current_e1rm: round1(d.cur), first_e1rm: round1(d.fst), progress_pct: round1(d.pct), current_norm: round1(cn), progress_norm: round1(pn), score: round1(0.6 * cn + 0.4 * pn), rank: 0 }
  }).sort((x, y) => y.score - x.score).map((e, i) => ({ ...e, rank: i + 1 }))
  must(await db.from('team_rankings').insert({
    team_id: team.id, lead_exercise_id: ex['Sentadilla'], calculated_by: coachId, calculated_at: '2026-10-09T21:00:00-03:00',
    approved_by: coachId, approved_at: '2026-10-09T21:05:00-03:00', entries,
  }), 'ranking')

  console.log('Ranking:', entries.map(e => `${e.rank}. ${e.full_name} ${e.score}`).join(' | '))
  console.log('Listo. Coach:', `${PREFIX}coach${DOMAIN}`, '· Alumna destacada:', `${PREFIX}sofia${DOMAIN}`)
}

if (process.argv[2] === '--cleanup') {
  console.log('Borrados:', await cleanup(), 'usuarios demo')
} else {
  await main()
}

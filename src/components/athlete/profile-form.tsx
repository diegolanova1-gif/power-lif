'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface AthleteProfileData {
  birth_date: string | null
  sex: 'M' | 'F' | null
  height_cm: number | null
  bodyweight_kg: number | null
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  goal: string | null
  experience: 'principiante' | 'intermedio' | 'avanzado' | null
  days_per_week: number | null
  injuries: string | null
  medical_notes: string | null
  notes: string | null
}

const EXPERIENCE = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
] as const

const toNumber = (text: string) => {
  const t = text.trim().replace(',', '.')
  return t === '' ? null : Number(t)
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T | null
  options: { value: T; label: string }[]
  onChange: (v: T | null) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ProfileForm({ athleteId, initial }: { athleteId: string; initial: AthleteProfileData }) {
  const [supabase] = useState(() => createClient())
  const [saving, setSaving] = useState(false)

  const [birthDate, setBirthDate] = useState(initial.birth_date ?? '')
  const [sex, setSex] = useState<'M' | 'F' | null>(initial.sex)
  const [height, setHeight] = useState(initial.height_cm?.toString() ?? '')
  const [bodyweight, setBodyweight] = useState(initial.bodyweight_kg?.toString() ?? '')
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [emergencyName, setEmergencyName] = useState(initial.emergency_contact_name ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(initial.emergency_contact_phone ?? '')
  const [goal, setGoal] = useState(initial.goal ?? '')
  const [experience, setExperience] = useState<AthleteProfileData['experience']>(initial.experience)
  const [days, setDays] = useState<number | null>(initial.days_per_week)
  const [injuries, setInjuries] = useState(initial.injuries ?? '')
  const [medical, setMedical] = useState(initial.medical_notes ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const h = toNumber(height)
    const w = toNumber(bodyweight)
    if (h !== null && (Number.isNaN(h) || h < 100 || h > 250)) return toast.error('La altura va entre 100 y 250 cm')
    if (w !== null && (Number.isNaN(w) || w < 30 || w > 300)) return toast.error('El peso va entre 30 y 300 kg')

    setSaving(true)
    const { error } = await supabase.from('athlete_profile').upsert(
      {
        athlete_id: athleteId,
        birth_date: birthDate || null,
        sex,
        height_cm: h,
        bodyweight_kg: w,
        phone: phone.trim() || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        goal: goal.trim() || null,
        experience,
        days_per_week: days,
        injuries: injuries.trim() || null,
        medical_notes: medical.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id' }
    )
    setSaving(false)
    if (error) {
      toast.error(`No se pudo guardar: ${error.message}`)
      return
    }
    toast.success('Perfil guardado')
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Sobre vos</h2>
        <div className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Fecha de nacimiento">
              <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </Field>
            <Field label="Sexo" hint="Se usa para comparar marcas">
              <Segmented<'M' | 'F'>
                value={sex}
                options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }]}
                onChange={setSex}
              />
            </Field>
            <Field label="Altura (cm)">
              <Input inputMode="decimal" placeholder="ej: 172" value={height} onChange={e => setHeight(e.target.value)} />
            </Field>
            <Field label="Peso corporal (kg)">
              <Input inputMode="decimal" placeholder="ej: 78,5" value={bodyweight} onChange={e => setBodyweight(e.target.value)} />
            </Field>
          </div>
          <Field label="Teléfono">
            <Input type="tel" inputMode="tel" placeholder="ej: 11 1234 5678" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Para tu coach</h2>
        <div className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <Field label="Objetivo" hint="¿Qué querés lograr? Una marca, competir, ganar fuerza…">
            <Textarea rows={2} value={goal} onChange={e => setGoal(e.target.value)} maxLength={500} />
          </Field>
          <Field label="Experiencia entrenando">
            <Segmented<NonNullable<AthleteProfileData['experience']>>
              value={experience}
              options={EXPERIENCE.map(e => ({ value: e.value, label: e.label }))}
              onChange={setExperience}
            />
          </Field>
          <Field label="Días por semana que podés entrenar">
            <Segmented<number>
              value={days}
              options={[1, 2, 3, 4, 5, 6, 7].map(n => ({ value: n, label: String(n) }))}
              onChange={setDays}
            />
          </Field>
          <Field label="Lesiones o molestias" hint="Pasadas o actuales: rodilla, hombro, espalda…">
            <Textarea rows={3} value={injuries} onChange={e => setInjuries(e.target.value)} maxLength={1000} />
          </Field>
          <Field label="Condiciones médicas o medicación" hint="Solo lo que tu coach necesite saber para cuidarte">
            <Textarea rows={3} value={medical} onChange={e => setMedical(e.target.value)} maxLength={1000} />
          </Field>
          <Field label="Algo más que quieras contarle">
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Contacto de emergencia</h2>
        <div className="grid gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2">
          <Field label="Nombre">
            <Input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Teléfono">
            <Input type="tel" inputMode="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} maxLength={40} />
          </Field>
        </div>
      </section>

      <Button type="submit" size="lg" className="h-12 w-full text-base sm:w-auto sm:self-start" disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {saving ? 'Guardando…' : 'Guardar perfil'}
      </Button>
    </form>
  )
}

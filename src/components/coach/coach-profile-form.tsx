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

export interface CoachProfileData {
  phone: string | null
  whatsapp: string | null
  city: string | null
  gym_name: string | null
  bio: string | null
  specialization: 'powerlifting' | 'bodybuilding' | 'fuerza_general' | 'crossfit' | 'otro' | null
  years_experience: number | null
  certifications: string | null
}

const SPECIALIZATIONS = [
  { value: 'powerlifting', label: 'Powerlifting' },
  { value: 'bodybuilding', label: 'Bodybuilding' },
  { value: 'fuerza_general', label: 'Fuerza general' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'otro', label: 'Otro' },
] as const

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

export function CoachProfileForm({ coachId, initial }: { coachId: string; initial: CoachProfileData }) {
  const [supabase] = useState(() => createClient())
  const [saving, setSaving] = useState(false)

  const [phone, setPhone] = useState(initial.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? '')
  const [city, setCity] = useState(initial.city ?? '')
  const [gymName, setGymName] = useState(initial.gym_name ?? '')
  const [bio, setBio] = useState(initial.bio ?? '')
  const [specialization, setSpecialization] = useState<CoachProfileData['specialization']>(initial.specialization)
  const [yearsExp, setYearsExp] = useState(initial.years_experience?.toString() ?? '')
  const [certifications, setCertifications] = useState(initial.certifications ?? '')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const years = yearsExp.trim() === '' ? null : Number(yearsExp)
    if (years !== null && (Number.isNaN(years) || years < 0 || years > 60)) return toast.error('Años de experiencia entre 0 y 60')

    setSaving(true)
    const { error } = await supabase.from('coach_profile').upsert(
      {
        coach_id: coachId,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        city: city.trim() || null,
        gym_name: gymName.trim() || null,
        bio: bio.trim() || null,
        specialization,
        years_experience: years,
        certifications: certifications.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'coach_id' }
    )
    setSaving(false)
    if (error) return toast.error(`No se pudo guardar: ${error.message}`)
    toast.success('Perfil guardado')
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Contacto</h2>
        <div className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Teléfono">
              <Input type="tel" inputMode="tel" placeholder="ej: 11 1234 5678" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} />
            </Field>
            <Field label="WhatsApp" hint="Para que tus alumnos te contacten">
              <Input type="tel" inputMode="tel" placeholder="ej: +54 9 11 1234 5678" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} maxLength={40} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ciudad">
              <Input placeholder="ej: Buenos Aires" value={city} onChange={e => setCity(e.target.value)} maxLength={100} />
            </Field>
            <Field label="Gimnasio">
              <Input placeholder="ej: Iron Gym" value={gymName} onChange={e => setGymName(e.target.value)} maxLength={100} />
            </Field>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">Perfil profesional</h2>
        <div className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <Field label="Bio" hint="Presentación corta que ven tus alumnos">
            <Textarea rows={3} placeholder="Contá quién sos y cómo trabajás..." value={bio} onChange={e => setBio(e.target.value)} maxLength={500} />
          </Field>
          <Field label="Especialidad">
            <Segmented<NonNullable<CoachProfileData['specialization']>>
              value={specialization}
              options={SPECIALIZATIONS.map(s => ({ value: s.value, label: s.label }))}
              onChange={setSpecialization}
            />
          </Field>
          <Field label="Años de experiencia">
            <Input inputMode="numeric" placeholder="ej: 5" value={yearsExp} onChange={e => setYearsExp(e.target.value)} className="w-24" />
          </Field>
          <Field label="Certificaciones" hint="Cursos, títulos, formaciones relevantes">
            <Textarea rows={3} placeholder="ej: Instructor Nacional de Musculación, CSCS..." value={certifications} onChange={e => setCertifications(e.target.value)} maxLength={1000} />
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

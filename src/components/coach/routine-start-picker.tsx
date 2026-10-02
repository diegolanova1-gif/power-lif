'use client'

import { FilePlus2, LayoutTemplate, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROUTINE_PRESETS, buildPresetStructure } from '@/lib/routine-presets'
import { ROUTINE_GOALS, type RoutineStructure } from '@/lib/validations/routine'

export interface RoutineTemplate {
  id: string
  name: string
  description: string | null
  structure: RoutineStructure
}

export interface StartChoice {
  structure: RoutineStructure | null
  name: string
  description: string
}

interface RoutineStartPickerProps {
  exercises: { id: string; name: string }[]
  templates: RoutineTemplate[]
  athleteName?: string
  onPick: (choice: StartChoice) => void
}

export function RoutineStartPicker({ exercises, templates, athleteName, onPick }: RoutineStartPickerProps) {
  const suffix = athleteName ? ` · ${athleteName}` : ''

  function pickPreset(presetId: string) {
    const preset = ROUTINE_PRESETS.find(p => p.id === presetId)!
    const { structure, missing } = buildPresetStructure(preset, exercises)
    if (missing.length) {
      toast.info(`No están en tu catálogo: ${missing.join(', ')}. Puedes agregarlos o elegir otros.`)
    }
    onPick({ structure, name: `${preset.name}${suffix}`, description: preset.description })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">¿Cómo quieres empezar?</h2>
        <button
          type="button"
          onClick={() => onPick({ structure: null, name: athleteName ? `Rutina de ${athleteName}` : '', description: '' })}
          className="w-full text-left"
        >
          <Card className="transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-muted p-3"><FilePlus2 className="h-6 w-6 text-muted-foreground" /></div>
              <div>
                <p className="font-semibold text-foreground">En blanco</p>
                <p className="text-sm text-muted-foreground">Armas cada día y cada ejercicio desde cero.</p>
              </div>
            </CardContent>
          </Card>
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-orange-500" />
          Modelos listos para adaptar
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ROUTINE_PRESETS.map(preset => (
            <button key={preset.id} type="button" onClick={() => pickPreset(preset.id)} className="text-left">
              <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{preset.name}</p>
                    <Badge variant="secondary">{ROUTINE_GOALS[preset.goal]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{preset.description}</p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">{preset.days.length} días/semana · {preset.weeks} semanas</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </section>

      {templates.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <LayoutTemplate className="h-4 w-4 text-blue-500" />
            Mis plantillas
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick({ structure: t.structure, name: `${t.name}${suffix}`, description: t.description ?? '' })}
                className="text-left"
              >
                <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                  <CardContent className="space-y-1 pt-6">
                    <p className="font-semibold text-foreground">{t.name}</p>
                    {t.description && <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
                    <p className="text-xs text-muted-foreground font-mono tabular-nums">{t.structure.schedule.length} días/semana · {t.structure.weeks} semanas</p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Lo que elijas se copia: después cambias ejercicios, series, reps y cargas{athleteName ? ` solo para ${athleteName}` : ''}.
      </p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Calendar, Dumbbell, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExerciseLogCard, type LoggedSet, type Prescription } from './exercise-log-card'
import { FreeformExerciseForm } from './freeform-exercise-form'

type Choice = 'advance_credit' | 'advance_no_credit' | 'freeform' | null

// Shown when the athlete already hit this real calendar week's target and
// wants to train again before it rolls over. current_week/current_day
// already point at the next normal session (the routine keeps advancing on
// its own, same as any other day) — this dialog only decides how THAT
// session gets tagged for the streak: does it credit next week's quota, or
// is it something unrelated to the plan entirely.
export function ExtraDayDialog({
  open,
  onOpenChange,
  exercises,
  athleteId,
  athleteRoutineId,
  week,
  day,
  setsByKey,
  e1rmByExercise,
  lastWeightByExercise,
  onExerciseSaved,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercises: Prescription[]
  athleteId: string
  athleteRoutineId: string
  week: number
  day: number
  setsByKey: Record<string, LoggedSet[]>
  e1rmByExercise: Map<string, number>
  lastWeightByExercise: Map<string, number>
  onExerciseSaved: (exerciseId: string, sets: LoggedSet[]) => void
  onDone: () => void
}) {
  const [choice, setChoice] = useState<Choice>(null)

  function close(shouldRefresh: boolean) {
    setChoice(null)
    onOpenChange(false)
    if (shouldRefresh) onDone()
  }

  return (
    <Dialog open={open} onOpenChange={o => (o ? onOpenChange(true) : close(false))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¡Ya cumpliste tus días de esta semana!</DialogTitle>
          <DialogDescription>¿Querés entrenar de nuevo? Elegí cómo contarlo — las tres suman a tu racha de días.</DialogDescription>
        </DialogHeader>

        {choice === null && (
          <div className="space-y-2">
            <Button variant="outline" className="h-auto w-full justify-start gap-3 py-3 text-left" onClick={() => setChoice('advance_credit')}>
              <Calendar className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block font-medium">Arrancar la semana que viene</span>
                <span className="block text-xs font-normal text-muted-foreground">Cuenta como el día 1 de la próxima semana — le resta un día a esa semana.</span>
              </span>
            </Button>
            <Button variant="outline" className="h-auto w-full justify-start gap-3 py-3 text-left" onClick={() => setChoice('advance_no_credit')}>
              <Dumbbell className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block font-medium">Entrenar un día más</span>
                <span className="block text-xs font-normal text-muted-foreground">Mismo entrenamiento, pero la semana que viene sigue necesitando sus días completos.</span>
              </span>
            </Button>
            <Button variant="outline" className="h-auto w-full justify-start gap-3 py-3 text-left" onClick={() => setChoice('freeform')}>
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block font-medium">Hacer otro ejercicio</span>
                <span className="block text-xs font-normal text-muted-foreground">Algo que no es de tu rutina — vos elegís qué.</span>
              </span>
            </Button>
          </div>
        )}

        {(choice === 'advance_credit' || choice === 'advance_no_credit') && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {exercises.map(ex => (
              <ExerciseLogCard
                key={ex.exercise_id}
                prescription={ex}
                logged={setsByKey[`${week}-${day}-${ex.exercise_id}`] ?? []}
                e1rm={e1rmByExercise.get(ex.exercise_id) ?? null}
                lastWeight={lastWeightByExercise.get(ex.exercise_id) ?? null}
                session={{ athleteId, athleteRoutineId, week, day }}
                extraType={choice}
                onSaved={sets => onExerciseSaved(ex.exercise_id, sets)}
              />
            ))}
            <Button variant="ghost" className="w-full" onClick={() => close(true)}>
              Listo
            </Button>
          </div>
        )}

        {choice === 'freeform' && (
          <FreeformExerciseForm
            athleteId={athleteId}
            athleteRoutineId={athleteRoutineId}
            week={week}
            day={day}
            onSaved={() => close(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

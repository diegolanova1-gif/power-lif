'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createExercise, type CreateExerciseInput } from '@/actions/exercises'
import type { ExerciseOption } from '@/components/coach/routine-builder'

const CATEGORIES: Record<CreateExerciseInput['category'], string> = {
  squat: 'Sentadilla',
  bench: 'Banca',
  deadlift: 'Peso muerto',
  accessory: 'Accesorio',
  olympic: 'Olímpico',
  other: 'Otro',
}

export function NewExerciseDialog({ onCreated }: { onCreated: (exercise: ExerciseOption) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<CreateExerciseInput['category']>('accessory')
  const [muscles, setMuscles] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    setSaving(true)
    const result = await createExercise({
      name,
      category,
      muscle_groups: muscles.split(',').map(m => m.trim()).filter(Boolean),
    })
    setSaving(false)

    if (result.error || !result.exercise) {
      toast.error(result.error ?? 'No se pudo crear el ejercicio')
      return
    }

    toast.success(`"${result.exercise.name}" agregado a tus ejercicios`)
    onCreated(result.exercise)
    setName('')
    setMuscles('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo ejercicio
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear ejercicio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exercise-name">Nombre</Label>
            <Input id="exercise-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Sentadilla con cadenas" maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={v => v && setCategory(v as CreateExerciseInput['category'])} items={CATEGORIES}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exercise-muscles">Músculos (opcional)</Label>
            <Input id="exercise-muscles" value={muscles} onChange={e => setMuscles(e.target.value)} placeholder="Cuádriceps, Glúteos" />
            <p className="text-xs text-gray-500">Separados por coma. Solo lo ven vos y tus atletas.</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleCreate} disabled={saving || name.trim().length < 2}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Crear ejercicio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

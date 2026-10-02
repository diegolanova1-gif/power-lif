'use client'

import { useId, useRef, useState } from 'react'
import { Check, Loader2, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ExerciseOption } from '@/components/coach/routine-builder'

const MAX_RESULTS = 8

// Accent/case-insensitive match: "press banca" finds "Press de Banca"
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

interface ExerciseComboboxProps {
  exercises: ExerciseOption[]
  value: string
  onChange: (exerciseId: string) => void
  onCreate: (name: string) => Promise<ExerciseOption | null>
}

export function ExerciseCombobox({ exercises, value, onChange, onCreate }: ExerciseComboboxProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = exercises.find(e => e.id === value)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [creating, setCreating] = useState(false)

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = words.length
    ? exercises.filter(e => words.every(w => normalize(e.name).includes(w))).slice(0, MAX_RESULTS)
    : exercises.slice(0, MAX_RESULTS)
  const exact = exercises.some(e => normalize(e.name) === normalize(query))
  const canCreate = query.trim().length >= 2 && !exact
  const optionCount = matches.length + (canCreate ? 1 : 0)

  function choose(id: string) {
    onChange(id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  async function create() {
    setCreating(true)
    const exercise = await onCreate(query.trim())
    setCreating(false)
    if (exercise) choose(exercise.id)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(i => Math.min(i + 1, optionCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Never submit the routine form from here
      e.preventDefault()
      if (!open || optionCount === 0) return
      if (active < matches.length) choose(matches[active].id)
      else if (canCreate) create()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="pl-8"
        placeholder="Escribe un ejercicio..."
        value={open ? query : selected?.name ?? ''}
        onFocus={() => {
          setQuery('')
          setActive(0)
          setOpen(true)
        }}
        onChange={e => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        disabled={creating}
      />
      {creating && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
        >
          {matches.map((e, i) => (
            <li
              key={e.id}
              role="option"
              aria-selected={e.id === value}
              onMouseDown={ev => ev.preventDefault()}
              onClick={() => choose(e.id)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm',
                i === active && 'bg-muted'
              )}
            >
              {e.name}
              {e.id === value && <Check className="h-4 w-4 text-primary" />}
            </li>
          ))}
          {canCreate && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={ev => ev.preventDefault()}
              onClick={create}
              onMouseEnter={() => setActive(matches.length)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-primary',
                active === matches.length && 'bg-muted'
              )}
            >
              <Plus className="h-4 w-4" />
              Crear &quot;{query.trim()}&quot;
            </li>
          )}
          {optionCount === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">Escribe al menos 2 letras para crear uno nuevo</li>}
        </ul>
      )}
    </div>
  )
}

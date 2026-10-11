'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'original' | 'oscuro' | 'rosa'

const STORAGE_KEY = 'pr-theme'

const MODES: { value: Mode; label: string; bg: string; card: string; accent: string; line: string }[] = [
  { value: 'original', label: 'Original', bg: '#fafafa', card: '#ffffff', accent: '#3a3f4b', line: '#e4e4e7' },
  { value: 'oscuro', label: 'Oscuro', bg: '#18181b', card: '#27272a', accent: '#a5b4fc', line: '#3f3f46' },
  { value: 'rosa', label: 'Rosa', bg: '#fff1f5', card: '#ffffff', accent: '#d6246e', line: '#f9c9da' },
]

function readMode(): Mode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'oscuro' || saved === 'rosa' ? saved : 'original'
  } catch {
    return 'original'
  }
}

export function applyTheme(mode: Mode) {
  const classes = document.documentElement.classList
  classes.remove('dark', 'theme-rosa')
  if (mode === 'oscuro') classes.add('dark')
  if (mode === 'rosa') classes.add('theme-rosa')
}

export function ThemeSelector() {
  const [mode, setMode] = useState<Mode>(() => (typeof window === 'undefined' ? 'original' : readMode()))

  function choose(next: Mode) {
    setMode(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* sin almacenamiento: el modo vale solo para esta sesión */
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">Apariencia</h2>
      <div className="grid grid-cols-3 gap-3">
        {MODES.map(m => {
          const selected = mode === m.value
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => choose(m.value)}
              aria-pressed={selected}
              className={cn(
                'rounded-2xl bg-card p-3 text-left ring-1 transition-all',
                selected ? 'ring-2 ring-primary' : 'ring-foreground/10 hover:ring-foreground/25'
              )}
            >
              <div className="mb-2 rounded-lg p-2" style={{ backgroundColor: m.bg, border: `1px solid ${m.line}` }}>
                <div className="mb-1.5 h-2 w-8 rounded-full" style={{ backgroundColor: m.accent }} />
                <div className="h-6 rounded-md" style={{ backgroundColor: m.card, border: `1px solid ${m.line}` }} />
              </div>
              <p className="flex items-center justify-between text-sm font-medium text-foreground">
                {m.label}
                {selected && <Check className="h-4 w-4 text-primary" />}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

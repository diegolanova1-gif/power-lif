'use client'

import { useState } from 'react'
import { X, UserMinus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DeletionNotice {
  id: string
  deleted_user_name: string
  deleted_user_role: 'coach' | 'athlete'
  deleted_at: string
}

export function DeletionNotices({ notices: initial }: { notices: DeletionNotice[] }) {
  const [supabase] = useState(() => createClient())
  const [notices, setNotices] = useState(initial)

  async function dismiss(id: string) {
    setNotices(prev => prev.filter(n => n.id !== id))
    await supabase.from('account_deletions').update({ seen_at: new Date().toISOString() }).eq('id', id)
  }

  if (notices.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-6">
      {notices.map(n => (
        <div key={n.id} className="flex items-center gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm ring-1 ring-destructive/20">
          <UserMinus className="h-4 w-4 shrink-0 text-destructive" />
          <span className="flex-1 text-foreground">
            <strong>{n.deleted_user_name}</strong>
            {n.deleted_user_role === 'athlete' ? ' (alumno) dio de baja su cuenta' : ' (coach) dio de baja su cuenta'}
            <span className="text-muted-foreground"> · {new Date(n.deleted_at).toLocaleDateString('es-AR')}</span>
          </span>
          <button onClick={() => dismiss(n.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

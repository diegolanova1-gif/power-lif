'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MediaType } from '@/lib/media'

export interface MediaItem {
  id: string
  storage_path: string
  media_type: MediaType
  url: string | null
}

interface MediaGridProps {
  items: MediaItem[]
  onDelete?: (item: MediaItem) => void
  deletingId?: string | null
}

export function MediaGrid({ items, onDelete, deletingId }: MediaGridProps) {
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(item => (
        <div key={item.id} className="group relative overflow-hidden rounded-lg border bg-black/5">
          {!item.url ? (
            <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">No disponible</div>
          ) : item.media_type === 'video' ? (
            <video src={item.url} controls preload="metadata" playsInline className="aspect-video w-full bg-black object-contain" />
          ) : (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from Supabase Storage */}
              <img src={item.url} alt="Foto del ejercicio" className="aspect-video w-full object-cover" />
            </a>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="absolute right-1 top-1 bg-white/90"
              onClick={() => onDelete(item)}
              disabled={deletingId === item.id}
              aria-label="Eliminar archivo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

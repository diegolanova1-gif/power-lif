'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'

interface FloatingStopwatchProps {
  onClose: () => void
}

export function FloatingStopwatch({ onClose }: FloatingStopwatchProps) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const accRef = useRef(0)
  const startRef = useRef(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (running) {
      startRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setElapsed(accRef.current + (Date.now() - startRef.current))
      }, 100)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const toggle = () => {
    if (running) accRef.current += Date.now() - startRef.current
    setRunning(r => !r)
  }

  const reset = () => {
    accRef.current = 0
    startRef.current = Date.now()
    setElapsed(0)
    if (!running) setRunning(true)
  }

  const totalMs = elapsed
  const min = Math.floor(totalMs / 60000)
  const sec = Math.floor((totalMs % 60000) / 1000)
  const cs = Math.floor((totalMs % 1000) / 10)

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 flex h-16 items-center">
      <div className="flex items-center gap-2.5 rounded-full bg-card px-3.5 py-1.5 shadow-lg ring-1 ring-foreground/10 animate-in fade-in zoom-in-95 duration-200">
        <span className="font-mono text-lg font-semibold tabular-nums text-foreground min-w-[7ch] text-center">
          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}<span className="text-sm opacity-60">.{String(cs).padStart(2, '0')}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90"
            aria-label={running ? 'Pausar' : 'Reanudar'}
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-90"
            aria-label="Reiniciar"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform active:scale-90"
            aria-label="Cerrar cronómetro"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

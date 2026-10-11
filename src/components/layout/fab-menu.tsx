'use client'

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FabMenuItem {
  name: string
  href: string
  // Rendered icon element (not a component reference — this crosses a
  // Server -> Client Component boundary, where only plain data and React
  // elements can be passed, not component functions).
  icon: ReactNode
  badge?: number
}

// Floating "abanico" launcher: a dumbbell button, fixed bottom-center, that
// fans the same options already in the top nav out in an arc when tapped.
export function FabMenu({ items }: { items: FabMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pendingRef = useRef<(() => void) | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    items.forEach((item) => router.prefetch(item.href))
  }, [open, items, router])

  useEffect(() => {
    setOpen(false)
    pendingRef.current?.()
    pendingRef.current = null
  }, [pathname])

  // New screen grows out of the button on top of the current one (View Transitions).
  // Browsers without support, or reduced-motion, fall through to a normal Link navigation.
  function handleNavigate(e: MouseEvent<HTMLAnchorElement>, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    if (href === pathname) return
    const doc = document as Document & {
      startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> }
    }
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    e.preventDefault()
    const rect = buttonRef.current?.getBoundingClientRect()
    const root = document.documentElement
    root.style.setProperty('--fab-x', `${rect ? rect.left + rect.width / 2 : window.innerWidth / 2}px`)
    root.style.setProperty('--fab-y', `${rect ? rect.top + rect.height / 2 : window.innerHeight - 52}px`)
    root.dataset.fabNav = ''
    flushSync(() => setOpen(false))

    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 2500)
          pendingRef.current = () => {
            window.clearTimeout(timer)
            resolve()
          }
          router.push(href)
        })
    )
    transition.finished.finally(() => {
      delete root.dataset.fabNav
    })
  }

  const n = items.length
  const spreadDeg = n > 1 ? Math.min(170, 24 * (n - 1)) : 0
  const startDeg = 90 + spreadDeg / 2
  const radius = 104

  return (
    <div
      ref={containerRef}
      style={{ viewTransitionName: 'fab' }}
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center"
    >
      {open && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 -z-10 cursor-default bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      <div className="relative">
        {items.map((item, i) => {
          const deg = n === 1 ? 90 : startDeg - (spreadDeg / (n - 1)) * i
          const rad = (deg * Math.PI) / 180
          const x = Math.cos(rad) * radius
          const y = -Math.sin(rad) * radius
          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavigate(e, item.href)}
              style={{
                transform: open ? `translate(${x}px, ${y}px) scale(1)` : 'translate(0px, 0px) scale(0.3)',
                transitionDelay: open ? `${i * 30}ms` : '0ms',
              }}
              className={cn(
                'absolute bottom-0 left-1/2 -ml-6 flex h-12 w-12 flex-col items-center justify-center rounded-full shadow-md ring-1 ring-foreground/10 transition-all duration-300 ease-out',
                open ? 'opacity-100' : 'pointer-events-none opacity-0',
                active ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
              )}
              aria-label={item.name}
              title={item.name}
            >
              {item.icon}
              {!!item.badge && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold tabular-nums text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-foreground/20 transition-transform active:scale-95"
        >
          <Dumbbell className={cn('h-6 w-6 transition-transform duration-300', open && 'rotate-90')} />
        </button>
      </div>
    </div>
  )
}

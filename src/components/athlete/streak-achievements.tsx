'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Crown, Download, Footprints, Landmark, Lock, Shield, Sparkle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { CATEGORIES, STREAK_CARDS, cardDescription, type CardCategory, type IconName, type StreakCard } from '@/lib/achievements'

const ICON_COMPONENT: Record<IconName, typeof Shield> = { footprints: Footprints, shield: Shield, crown: Crown, landmark: Landmark, sparkle: Sparkle }

// Paths crudos de lucide-react, para poder dibujar el mismo ícono en el SVG
// generado a mano (la carta descargable) fuera de React.
const ICON_PATHS: Record<IconName, string[]> = {
  footprints: [
    'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z',
    'M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z',
    'M16 17h4',
    'M4 13h4',
  ],
  shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  crown: [
    'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z',
    'M5 21h14',
  ],
  landmark: [
    'M10 18v-7',
    'M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z',
    'M14 18v-7',
    'M18 18v-7',
    'M3 22h18',
    'M6 18v-7',
  ],
  sparkle: ['M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z'],
}

function escapeXml(text: string) {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
}

// Corta la frase en 1-2 líneas cerca de la mitad, sin pasarse de ~32
// caracteres por línea — alcanza para las frases cortas de cada carta.
function wrapQuote(quote: string): string[] {
  if (quote.length <= 34) return [quote]
  const words = quote.split(' ')
  let line1 = ''
  let i = 0
  while (i < words.length && (line1 + words[i]).length <= 34) {
    line1 += (line1 ? ' ' : '') + words[i]
    i++
  }
  const line2 = words.slice(i).join(' ')
  return line2 ? [line1, line2] : [line1]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildCardSvg(card: StreakCard, athleteName: string, unlockedAt: string | null): string {
  const cat = CATEGORIES[card.category]
  const quoteLines = wrapQuote(card.quote)
  const quoteY = quoteLines.length === 1 ? 430 : 418
  const icon = ICON_PATHS[cat.icon].map(d => `<path d="${d}" />`).join('')

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840">
  <defs>
    <linearGradient id="bg-${card.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c1c1f" />
      <stop offset="100%" stop-color="#08080a" />
    </linearGradient>
  </defs>
  <rect width="600" height="840" rx="28" fill="url(#bg-${card.id})" />
  <rect x="14" y="14" width="572" height="812" rx="20" fill="none" stroke="${cat.accent}" stroke-width="2" />
  <rect x="26" y="26" width="548" height="788" rx="14" fill="none" stroke="${cat.accent}" stroke-opacity="0.35" stroke-width="1" />

  <text x="300" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="${cat.accent}">DISTINCIÓN DE CONSTANCIA</text>
  <text x="300" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" letter-spacing="1" fill="rgba(255,255,255,0.45)">COLECCIÓN · ${String(card.number).padStart(3, '0')} / 050</text>

  <circle cx="300" cy="195" r="72" fill="none" stroke="${cat.accent}" stroke-width="1.5" />
  <g transform="translate(265, 160) scale(2.9)" fill="${cat.accent}" stroke="none">${icon}</g>

  <text x="300" y="330" text-anchor="middle" font-family="Georgia, serif" font-size="104" font-weight="700" fill="${cat.accentSoft}">${card.requiredDays}</text>
  <text x="300" y="382" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="700" letter-spacing="1" fill="#ffffff">${escapeXml(card.name.toUpperCase())}</text>
  ${quoteLines.map((line, i) => `<text x="300" y="${quoteY + i * 26}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="19" fill="rgba(255,255,255,0.65)">${escapeXml(line)}</text>`).join('')}

  <line x1="90" y1="500" x2="510" y2="500" stroke="${cat.accent}" stroke-opacity="0.4" stroke-width="1" />

  <text x="300" y="536" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${cat.accent}">LOGRO DESBLOQUEADO</text>
  <text x="300" y="566" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" fill="#ffffff">${escapeXml(cardDescription(card))}</text>
  ${unlockedAt ? `<text x="300" y="596" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">${formatDate(unlockedAt)}</text>` : ''}
  ${athleteName ? `<text x="300" y="${unlockedAt ? 650 : 630}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.55)">${escapeXml(athleteName)}</text>` : ''}

  <line x1="90" y1="762" x2="510" y2="762" stroke="${cat.accent}" stroke-opacity="0.3" stroke-width="1" />
  <text x="300" y="792" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" letter-spacing="2" fill="rgba(255,255,255,0.4)">COLECCIÓN DE RACHAS</text>
  <text x="300" y="816" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1" fill="${cat.accent}">${String(card.number).padStart(3, '0')} / 050</text>
</svg>`.trim()
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function downloadCard(card: StreakCard, athleteName: string, unlockedAt: string | null) {
  const svg = buildCardSvg(card, athleteName, unlockedAt)
  const img = new window.Image()
  img.src = svgDataUrl(svg)
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1680
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, 1200, 1680)

  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `power-routine-carta-${String(card.number).padStart(3, '0')}.png`
  a.click()
  URL.revokeObjectURL(url)
}

const CATEGORY_ORDER: CardCategory[] = ['inicio', 'resistencia', 'elite', 'legado', 'miticas']

interface StreakAchievementsProps {
  unlockedCards: string[]
  /** id de carta -> fecha ISO de desbloqueo */
  unlockedDates: Record<string, string>
  /** Racha actual (días reales consecutivos) */
  streakDays: number
  currentWeekDays: number
  currentWeekRequired: number
  athleteName: string
}

export function StreakAchievements({ unlockedCards, unlockedDates, streakDays, currentWeekDays, currentWeekRequired, athleteName }: StreakAchievementsProps) {
  const [openCard, setOpenCard] = useState<StreakCard | null>(null)

  const unlockedSet = new Set(unlockedCards)
  const nextCard = STREAK_CARDS.find(c => !unlockedSet.has(c.id)) ?? null
  const daysRemaining = nextCard ? Math.max(0, nextCard.requiredDays - streakDays) : 0

  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-950 text-zinc-50">
      <CardContent className="py-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">COLECCIÓN</p>
            <p className="font-mono text-3xl font-extrabold tabular-nums">{unlockedCards.length} <span className="text-lg font-normal text-zinc-500">/ 50 cartas</span></p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">RACHA ACTUAL</p>
            <p className="font-mono text-3xl font-extrabold tabular-nums">{streakDays} <span className="text-lg font-normal text-zinc-500">{streakDays === 1 ? 'día' : 'días'}</span></p>
            <p className="text-xs text-zinc-500">esta semana {currentWeekDays}/{currentWeekRequired}</p>
          </div>
          {nextCard ? (
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">PRÓXIMO LOGRO</p>
              <p className="text-lg font-bold uppercase tracking-wide" style={{ color: CATEGORIES[nextCard.category].accent }}>{nextCard.name}</p>
              <p className="text-xs text-zinc-500">{nextCard.requiredDays} días · faltan {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500">COLECCIÓN COMPLETA</p>
              <p className="text-lg font-bold uppercase tracking-wide text-amber-300">Las 50 cartas</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {CATEGORY_ORDER.map(categoryKey => {
            const meta = CATEGORIES[categoryKey]
            const cards = STREAK_CARDS.filter(c => c.category === categoryKey)
            const CategoryIcon = ICON_COMPONENT[meta.icon]
            return (
              <div key={categoryKey}>
                <div className="mb-2 flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4" style={{ color: meta.accent }} strokeWidth={1.75} />
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: meta.accent }}>{meta.label}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {cards.map(card => {
                    const unlocked = unlockedSet.has(card.id)
                    if (unlocked) {
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setOpenCard(card)}
                          className="group aspect-[5/7] overflow-hidden rounded-lg border transition-transform hover:scale-[1.03]"
                          style={{ borderColor: meta.accent, backgroundImage: `url("${svgDataUrl(buildCardSvg(card, '', unlockedDates[card.id] ?? null))}")`, backgroundSize: 'cover' }}
                        >
                          <span className="sr-only">Ver carta {card.name}</span>
                        </button>
                      )
                    }
                    const progress = Math.min(streakDays, card.requiredDays)
                    return (
                      <div key={card.id} className="flex aspect-[5/7] flex-col items-center justify-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-1.5 py-2 text-center">
                        <Lock className="h-4 w-4 text-zinc-600" />
                        <span className="font-mono text-[10px] text-zinc-600">{String(card.number).padStart(3, '0')}</span>
                        <span className="text-[11px] font-semibold uppercase leading-tight text-zinc-400">{card.name}</span>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-600">{progress}/{card.requiredDays}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <Dialog open={openCard !== null} onOpenChange={open => !open && setOpenCard(null)}>
        <DialogContent className="max-w-sm border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{openCard?.name ?? 'Carta de racha'}</DialogTitle>
          {openCard && (
            <div className="flex flex-col items-center gap-3">
              <Image
                src={svgDataUrl(buildCardSvg(openCard, athleteName, unlockedDates[openCard.id] ?? null))}
                alt={openCard.name}
                width={600}
                height={840}
                unoptimized
                className="w-full rounded-2xl"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => downloadCard(openCard, athleteName, unlockedDates[openCard.id] ?? null)}>
                  <Download className="mr-1 h-4 w-4" />
                  Descargar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpenCard(null)}>
                  <X className="mr-1 h-4 w-4" />
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

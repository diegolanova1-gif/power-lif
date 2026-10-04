'use client'

import { Download, Flame, Lock, Medal, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MILESTONES, type IconName, type Milestone } from '@/lib/achievements'

const ICON_COMPONENT: Record<IconName, typeof Flame> = { flame: Flame, trophy: Trophy, medal: Medal }

// Raw path data straight from the lucide-react icons above, so the
// downloadable sticker (built outside React, as an SVG string) matches what
// the card shows in the app.
const ICON_SVG: Record<IconName, { style: 'fill' | 'stroke'; paths: string[]; circles?: { cx: number; cy: number; r: number }[] }> = {
  flame: {
    style: 'fill',
    paths: ['M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'],
  },
  trophy: {
    style: 'stroke',
    paths: [
      'M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2',
      'M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2',
      'M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3',
      'M4 22h16',
      'M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z',
      'M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3',
    ],
  },
  medal: {
    style: 'stroke',
    paths: [
      'M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15',
      'M11 12 5.12 2.2',
      'm13 12 5.88-9.8',
      'M8 7h8',
      'M12 18v-2h-.5',
    ],
    circles: [{ cx: 12, cy: 17, r: 5 }],
  },
}

function renderIconGroup(icon: IconName, x: number, y: number, scale: number) {
  const def = ICON_SVG[icon]
  const common = def.style === 'fill' ? 'fill="#ffffff" stroke="none"' : 'fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
  const paths = def.paths.map(d => `<path d="${d}" />`).join('')
  const circles = (def.circles ?? []).map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" />`).join('')
  return `<g transform="translate(${x}, ${y}) scale(${scale})" ${common}>${paths}${circles}</g>`
}

function buildBadgeSvg(milestone: Milestone, athleteName: string) {
  const [from, to] = milestone.colors
  const gradientId = `grad-${milestone.id}`
  const title = milestone.type === 'days' ? `${milestone.days}` : ''
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="600" height="600" rx="48" fill="url(#${gradientId})" />
  <circle cx="300" cy="215" r="130" fill="rgba(255,255,255,0.14)" />
  ${renderIconGroup(milestone.icon, 240, 125, 5)}
  ${title ? `<text x="300" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="800" fill="#ffffff">${title}</text>` : ''}
  <text x="300" y="${title ? 430 : 300}" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff" letter-spacing="1">${milestone.label}</text>
  <text x="300" y="${title ? 465 : 335}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.85)">${milestone.description}</text>
  ${athleteName ? `<text x="300" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.7)">${athleteName}</text>` : ''}
  <text x="300" y="565" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="rgba(255,255,255,0.6)" letter-spacing="1">POWER ROUTINE</text>
</svg>`.trim()
}

function escapeXml(text: string) {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function downloadBadge(milestone: Milestone, athleteName: string) {
  const svg = buildBadgeSvg(milestone, escapeXml(athleteName))
  const img = new Image()
  img.src = svgDataUrl(svg)
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1200
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, 1200, 1200)

  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `power-routine-${milestone.id}.png`
  a.click()
  URL.revokeObjectURL(url)
}

export function StreakAchievements({ unlockedMilestones, athleteName }: { unlockedMilestones: string[]; athleteName: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <h3 className="mb-1 font-semibold text-foreground">Logros</h3>
        <p className="mb-4 text-sm text-muted-foreground">Insignias que se desbloquean solas y quedan guardadas para siempre.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {MILESTONES.map(milestone => {
            const unlocked = unlockedMilestones.includes(milestone.id)
            const Icon = ICON_COMPONENT[milestone.icon]
            const [from, to] = milestone.colors
            return (
              <div key={milestone.id} className="flex flex-col items-center gap-2 text-center">
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-2xl shadow-sm"
                  style={
                    unlocked
                      ? { background: `linear-gradient(135deg, ${from}, ${to})` }
                      : {
                          backgroundImage: `url("${svgDataUrl(buildBadgeSvg(milestone, ''))}")`,
                          backgroundSize: 'cover',
                          filter: 'grayscale(1) brightness(0.55)',
                        }
                  }
                >
                  {unlocked ? (
                    <Icon className="h-9 w-9 text-white" strokeWidth={milestone.icon === 'flame' ? undefined : 1.75} />
                  ) : (
                    <Lock className="h-6 w-6 text-white/90" />
                  )}
                </div>
                <span className="text-xs font-medium text-foreground">{milestone.label}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{milestone.description}</span>
                {unlocked && (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => downloadBadge(milestone, athleteName)}>
                    <Download className="mr-1 h-3 w-3" />
                    Descargar
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

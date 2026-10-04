'use client'

import { Download, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { STREAK_MILESTONES, STREAK_MILESTONE_LABELS } from '@/lib/achievements'

const FLAME_PATH = 'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'

const TIER_COLORS: Record<number, [string, string]> = {
  10: ['#f59e0b', '#ea580c'],
  30: ['#9ca3af', '#4b5563'],
  60: ['#fbbf24', '#b45309'],
  100: ['#a78bfa', '#6d28d9'],
}

function buildBadgeSvg(milestone: number, athleteName: string) {
  const [from, to] = TIER_COLORS[milestone] ?? ['#6366f1', '#4338ca']
  const label = STREAK_MILESTONE_LABELS[milestone] ?? 'Racha'
  const gradientId = `grad-${milestone}`
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="600" height="600" rx="48" fill="url(#${gradientId})" />
  <circle cx="300" cy="220" r="130" fill="rgba(255,255,255,0.14)" />
  <g transform="translate(240, 130) scale(5)">
    <path d="${FLAME_PATH}" fill="#ffffff" />
  </g>
  <text x="300" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="800" fill="#ffffff">${milestone}</text>
  <text x="300" y="425" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="rgba(255,255,255,0.9)" letter-spacing="2">DÍAS DE RACHA</text>
  <text x="300" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="rgba(255,255,255,0.85)">${label}</text>
  ${athleteName ? `<text x="300" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.7)">${athleteName}</text>` : ''}
  <text x="300" y="565" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="rgba(255,255,255,0.6)" letter-spacing="1">POWER ROUTINE</text>
</svg>`.trim()
}

function escapeXml(text: string) {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)
}

async function downloadBadge(milestone: number, athleteName: string) {
  const svg = buildBadgeSvg(milestone, escapeXml(athleteName))
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  const img = new Image()
  img.src = svgDataUrl
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
  a.download = `power-routine-racha-${milestone}-dias.png`
  a.click()
  URL.revokeObjectURL(url)
}

export function StreakAchievements({ unlockedMilestones, athleteName }: { unlockedMilestones: number[]; athleteName: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <h3 className="mb-4 font-semibold text-foreground">Logros de racha</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STREAK_MILESTONES.map(milestone => {
            const unlocked = unlockedMilestones.includes(milestone)
            const [from, to] = TIER_COLORS[milestone]
            return (
              <div key={milestone} className="flex flex-col items-center gap-2">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-extrabold text-white shadow-sm"
                  style={unlocked ? { background: `linear-gradient(135deg, ${from}, ${to})` } : undefined}
                >
                  {unlocked ? milestone : <Lock className="h-6 w-6 text-muted-foreground" />}
                </div>
                <span className="text-center text-xs text-muted-foreground">{STREAK_MILESTONE_LABELS[milestone]}</span>
                {unlocked ? (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => downloadBadge(milestone, athleteName)}>
                    <Download className="mr-1 h-3 w-3" />
                    Descargar
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{milestone} días</span>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

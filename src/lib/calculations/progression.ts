export type Trend = 'up' | 'down' | 'flat' | 'insufficient'

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendResult {
  trend: Trend
  /** % de cambio entre la mejor marca vieja y la mejor marca reciente */
  deltaPct: number | null
  recentBest: number | null
  olderBest: number | null
}

/**
 * Compara la mejor marca de los últimos `windowDays` contra la mejor marca
 * de antes de ese período. Necesita puntos de los dos lados de la ventana
 * para poder opinar — si no, 'insufficient' (recién empezó, o no entrena
 * hace rato y ya lo captura otra alerta).
 */
export function classifyTrend(points: TrendPoint[], now: Date = new Date(), windowDays = 21, tolerancePct = 2): TrendResult {
  if (points.length < 2) return { trend: 'insufficient', deltaPct: null, recentBest: null, olderBest: null }

  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const recent = points.filter(p => new Date(p.date) >= cutoff)
  const older = points.filter(p => new Date(p.date) < cutoff)
  if (!recent.length || !older.length) return { trend: 'insufficient', deltaPct: null, recentBest: null, olderBest: null }

  const recentBest = Math.max(...recent.map(p => p.value))
  const olderBest = Math.max(...older.map(p => p.value))
  const deltaPct = ((recentBest - olderBest) / olderBest) * 100
  const trend: Trend = deltaPct > tolerancePct ? 'up' : deltaPct < -tolerancePct ? 'down' : 'flat'

  return { trend, deltaPct, recentBest, olderBest }
}

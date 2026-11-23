// Maps a routine's week/day (1=Lunes..7=Domingo, repeating) onto real calendar
// dates, anchored to the Monday of the week that contains `started_at`.

export function mondayOf(date: Date) {
  const isoWeekday = ((date.getDay() + 6) % 7) + 1 // 1=Lunes..7=Domingo
  const monday = new Date(date)
  monday.setDate(date.getDate() - (isoWeekday - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function dateForWeekDay(startedAt: string, week: number, day: number) {
  const startMonday = mondayOf(new Date(`${startedAt}T00:00:00`))
  const dt = new Date(startMonday)
  dt.setDate(startMonday.getDate() + (week - 1) * 7 + (day - 1))
  return dt
}

const addDays = (date: Date, n: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Calendar-aware resolver: each week is anchored to the Monday it was really
// trained on (or the next free Monday after the previous week), so a lagging
// athlete never keeps showing dates in the past. In the current, still
// untouched week, pending days earlier than today are laid out from today on.
export function makeDateResolver(opts: {
  startedAt: string
  totalWeeks: number
  logged: Record<string, Date>
  currentWeek: number
  currentWeekDays: number[]
  today?: Date
}) {
  const { startedAt, totalWeeks, logged, currentWeek, currentWeekDays } = opts
  const today = new Date(opts.today ?? new Date())
  today.setHours(0, 0, 0, 0)
  const baseMonday = dateForWeekDay(startedAt, 1, 1)

  const anchors: Date[] = []
  for (let w = 1; w <= Math.max(totalWeeks, currentWeek); w++) {
    const earliest = Object.entries(logged)
      .filter(([k]) => Number(k.split('-')[0]) === w)
      .map(([, v]) => v)
      .sort((a, b) => a.getTime() - b.getTime())[0]
    let anchor = earliest ? mondayOf(earliest) : addDays(baseMonday, (w - 1) * 7)
    if (!earliest && w === currentWeek && anchor < mondayOf(today)) anchor = mondayOf(today)
    const prev = anchors[w - 2]
    if (prev && anchor < addDays(prev, 7)) anchor = addDays(prev, 7)
    anchors.push(anchor)
  }

  const pendingShift = new Map<number, Date>()
  const currentAnchor = anchors[currentWeek - 1]
  const currentHasLogs = Object.keys(logged).some(k => Number(k.split('-')[0]) === currentWeek)
  if (currentAnchor && !currentHasLogs) {
    let cursor = today
    for (const d of [...currentWeekDays].sort((a, b) => a - b)) {
      const natural = addDays(currentAnchor, d - 1)
      const date = natural > cursor ? natural : cursor
      pendingShift.set(d, date)
      cursor = addDays(date, 1)
    }
  }

  return (week: number, day: number): Date => {
    const real = logged[`${week}-${day}`]
    if (real) return real
    if (week === currentWeek && pendingShift.has(day)) return pendingShift.get(day)!
    const anchor = anchors[week - 1] ?? addDays(baseMonday, (week - 1) * 7)
    return addDays(anchor, day - 1)
  }
}

export function isToday(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() === today.getTime()
}

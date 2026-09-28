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

export function isToday(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() === today.getTime()
}

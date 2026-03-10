const CRON_PATTERN = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/

const DAY_NAMES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

export function toCronExpression(schedule: string): string {
  const s = schedule.trim().toLowerCase()

  if (CRON_PATTERN.test(s)) return s

  // "every N minutes"
  const everyNMin = s.match(/^every (\d+) minutes?$/)
  if (everyNMin) return `*/${everyNMin[1]} * * * *`

  // "every hour"
  if (s === 'every hour') return '0 * * * *'

  // "every day at HH:MM"
  const everyDayAt = s.match(/^every day at (\d{1,2}):(\d{2})$/)
  if (everyDayAt) return `${parseInt(everyDayAt[2])} ${parseInt(everyDayAt[1])} * * *`

  // "every <weekday> at HH:MM"
  const everyWeekdayAt = s.match(/^every (\w+) at (\d{1,2}):(\d{2})$/)
  if (everyWeekdayAt) {
    const day = DAY_NAMES[everyWeekdayAt[1]]
    if (day !== undefined) {
      return `${parseInt(everyWeekdayAt[3])} ${parseInt(everyWeekdayAt[2])} * * ${day}`
    }
  }

  // "every Nth of month at HH:MM"
  const everyNthAt = s.match(/^every (\d+)(?:st|nd|rd|th) of month at (\d{1,2}):(\d{2})$/)
  if (everyNthAt) {
    return `${parseInt(everyNthAt[3])} ${parseInt(everyNthAt[2])} ${everyNthAt[1]} * *`
  }

  // "every day" (no time specified)
  if (s === 'every day') return '0 0 * * *'

  throw new Error(`Cannot parse schedule: "${schedule}"`)
}

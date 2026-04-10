import { type Event } from '@/lib/types'

export function toOrdinal(n: number): string {
  if (n <= 0) return String(n)
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Returns the next calendar occurrence of a recurring event (this year or next). */
export function getNextOccurrence(event: Event): Date {
  const d = new Date(event.event_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!event.is_recurring) return d

  const thisYear = today.getFullYear()
  const month = d.getMonth()   // local month
  const day = d.getDate()      // local day

  const thisYearOcc = new Date(thisYear, month, day)
  return thisYearOcc >= today
    ? thisYearOcc
    : new Date(thisYear + 1, month, day)
}

/** Returns "62nd Birthday", "30th Anniversary", or "5th Year" etc. */
export function getMilestoneText(event: Event): string {
  const d = new Date(event.event_date)
  const nextOcc = getNextOccurrence(event)
  const years = nextOcc.getFullYear() - d.getFullYear()
  if (years <= 0) return ''

  const ordinal = toOrdinal(years)
  const t = event.title.toLowerCase()

  if (t.includes('birthday')) return `${ordinal} Birthday`
  if (t.includes('anniversary')) return `${ordinal} Anniversary`
  return `${ordinal} Year`
}

/**
 * Returns true if the stored event_date has an explicit local time
 * (i.e. not local midnight, which is our "no time set" convention).
 */
export function eventHasTime(event: Event): boolean {
  const d = new Date(event.event_date)
  return d.getHours() !== 0 || d.getMinutes() !== 0
}

/** Format the date string shown on an event card. */
export function formatCardDate(event: Event): string {
  const d = new Date(event.event_date)

  if (event.is_recurring) {
    const milestone = getMilestoneText(event)
    const nextOcc = getNextOccurrence(event)
    const monthDay = nextOcc.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    return milestone ? `${milestone} · ${monthDay}` : monthDay
  }

  // One-time event
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (eventHasTime(event)) {
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${dateStr} · ${timeStr}`
  }

  return dateStr
}

/** Sort events by their next upcoming date, nearest first. */
export function sortByNextOccurrence(events: Event[]): Event[] {
  return [...events].sort(
    (a, b) => getNextOccurrence(a).getTime() - getNextOccurrence(b).getTime()
  )
}

export type CountdownVariant = 'today' | 'tomorrow' | 'days' | 'months-near' | 'months-far'

/** Returns a countdown label + display variant for an event card badge. */
export function getCountdownBadge(
  event: Event
): { label: string; variant: CountdownVariant } | null {
  const next = getNextOccurrence(event)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  next.setHours(0, 0, 0, 0)

  const days = Math.round((next.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  if (days < 0) return null // past one-time event
  if (days === 0) return { label: 'TODAY!', variant: 'today' }
  if (days === 1) return { label: 'TOMORROW', variant: 'tomorrow' }
  if (days <= 30) return { label: `IN ${days} DAYS`, variant: 'days' }

  const months = Math.max(1, Math.round(days / 30))
  const suffix = months === 1 ? 'MONTH' : 'MONTHS'
  if (days <= 90) return { label: `IN ${months} ${suffix}`, variant: 'months-near' }
  return { label: `IN ${months} ${suffix}`, variant: 'months-far' }
}

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { type NextRequest, NextResponse } from 'next/server'

const IST = 'Asia/Kolkata'
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000 // 5h30m in ms

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for a Date in IST. */
function toISTDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: IST })
}

/** Adds `days` to a YYYY-MM-DD string, returns YYYY-MM-DD. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(y, m - 1, d + days)
  return [
    result.getFullYear(),
    String(result.getMonth() + 1).padStart(2, '0'),
    String(result.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Number of calendar days from dateA to dateB (both YYYY-MM-DD, dateB >= dateA). */
function daysBetween(dateA: string, dateB: string): number {
  const [ya, ma, da] = dateA.split('-').map(Number)
  const [yb, mb, db] = dateB.split('-').map(Number)
  return Math.round(
    (Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / (24 * 60 * 60 * 1000)
  )
}

/** Next calendar occurrence of an event in IST (YYYY-MM-DD). */
function nextOccurrenceIST(
  eventDateIST: string,
  isRecurring: boolean,
  todayIST: string
): string {
  if (!isRecurring) return eventDateIST
  const mm = eventDateIST.slice(5, 7)
  const dd = eventDateIST.slice(8, 10)
  const thisYear = todayIST.slice(0, 4)
  const thisYearOcc = `${thisYear}-${mm}-${dd}`
  if (thisYearOcc >= todayIST) return thisYearOcc
  return `${Number(thisYear) + 1}-${mm}-${dd}`
}

/** This calendar year's occurrence of a recurring event in IST. */
function thisYearOccurrenceIST(eventDateIST: string, todayIST: string): string {
  const mm = eventDateIST.slice(5, 7)
  const dd = eventDateIST.slice(8, 10)
  return `${todayIST.slice(0, 4)}-${mm}-${dd}`
}

/** Returns the hour/minute of a Date in IST (24h). */
function getISTHourMinute(d: Date): { hour: number; minute: number } {
  const str = d.toLocaleTimeString('en-GB', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const [hour, minute] = str.split(':').map(Number)
  return { hour, minute }
}

/**
 * Returns the IST date (YYYY-MM-DD) on which a reminder should be sent.
 *
 * With explicit time:
 *   - week_before   → same time as event, 7 days earlier
 *   - 3_hours_before → 3 hours before the event time
 *
 * Without explicit time (midnight IST = no time set):
 *   - week_before   → midnight IST 8 days before (≈ "9 PM IST, 8 days before")
 *   - 3_hours_before → midnight IST 1 day before (≈ "9 PM IST, day before")
 */
function getReminderDayIST(
  event: EventRow,
  reminderType: 'week_before' | '3_hours_before',
  todayIST: string
): string {
  const eventDt = new Date(event.event_date)
  const eventDateIST = toISTDateStr(eventDt)
  const { hour, minute } = getISTHourMinute(eventDt)
  const hasTime = hour !== 0 || minute !== 0

  // For recurring events use the next upcoming occurrence date
  const targetDateIST = event.is_recurring
    ? nextOccurrenceIST(eventDateIST, true, todayIST)
    : eventDateIST

  if (!hasTime) {
    // No explicit time — use midnight IST convention
    return reminderType === 'week_before'
      ? addDays(targetDateIST, -8) // 8 days before at midnight IST
      : addDays(targetDateIST, -1) // day before at midnight IST
  }

  // Has explicit time — calculate exact reminder timestamp in IST then convert to date
  const [y, m, d] = targetDateIST.split('-').map(Number)
  // Build event UTC ms: treat (y, m, d, hour, minute) as IST and subtract offset
  const eventUTCms = Date.UTC(y, m - 1, d, hour, minute) - IST_OFFSET_MS

  const reminderUTCms =
    reminderType === '3_hours_before'
      ? eventUTCms - 3 * 60 * 60 * 1000
      : eventUTCms - 7 * 24 * 60 * 60 * 1000 // 7 days earlier, same time

  return toISTDateStr(new Date(reminderUTCms))
}

// ─── Email content helpers ────────────────────────────────────────────────────

function toOrdinal(n: number): string {
  if (n <= 0) return String(n)
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function milestoneText(
  title: string,
  eventDateIST: string,
  nextOccIST: string
): string {
  const years = Number(nextOccIST.slice(0, 4)) - Number(eventDateIST.slice(0, 4))
  if (years <= 0) return ''
  const ordinal = toOrdinal(years)
  const t = title.toLowerCase()
  if (t.includes('birthday')) return `${ordinal} Birthday`
  if (t.includes('anniversary')) return `${ordinal} Anniversary`
  return `${ordinal} Year`
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// ─── HTML email template ──────────────────────────────────────────────────────

function timelineMessage(daysUntil: number): string {
  const pink = 'color:#E91E8C;'
  if (daysUntil <= 0) return `This event is <strong style="${pink}">today</strong>!`
  if (daysUntil === 1) return `This event is <strong style="${pink}">tomorrow</strong>!`
  return `This event is coming up in <strong style="${pink}">${daysUntil} days</strong>.`
}

function buildEmailHTML(opts: {
  recipientName: string
  eventTitle: string
  nextOccIST: string
  milestone: string
  daysUntil: number
}): string {
  const { recipientName, eventTitle, nextOccIST, milestone, daysUntil } = opts
  const dateFormatted = formatDateLong(nextOccIST)
  const timelineHtml = timelineMessage(daysUntil)
  const firstName = recipientName ? recipientName.split(' ')[0] : 'there'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Reminder: ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#FFF8E7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF8E7;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

      <!-- Logo row -->
      <tr>
        <td style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:40px;height:40px;background:#E91E8C;border:3px solid #1a1a2e;text-align:center;vertical-align:middle;font-size:18px;line-height:1;">
                &#128276;
              </td>
              <td style="padding-left:12px;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1a1a2e;">
                REMINDERS BY RAJAT
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Card -->
      <tr>
        <td style="background:#ffffff;border:3px solid #1a1a2e;padding:0;">
          <div style="height:4px;background:#E91E8C;"></div>
          <div style="padding:32px;">

            <div style="display:inline-block;border:2px solid #1a1a2e;padding:4px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;margin-bottom:24px;">
              EVENT REMINDER
            </div>

            <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a2e;line-height:1.5;">Hi ${firstName},</p>
            <p style="margin:0 0 28px 0;font-size:15px;color:#1a1a2e;line-height:1.6;">${timelineHtml}</p>

            <div style="height:2px;background:#1a1a2e;margin-bottom:28px;"></div>

            <div style="margin-bottom:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;">EVENT</div>
            <div style="margin-bottom:20px;font-size:22px;font-weight:700;text-transform:uppercase;color:#E91E8C;letter-spacing:0.5px;line-height:1.2;">${eventTitle}</div>

            ${milestone ? `
            <div style="margin-bottom:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;">MILESTONE</div>
            <div style="margin-bottom:20px;font-size:17px;font-weight:700;color:#1a1a2e;">${milestone}</div>
            ` : ''}

            <div style="background:#FFF8E7;border:2px solid #1a1a2e;padding:14px 16px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:4px;">DATE</div>
              <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${dateFormatted}</div>
            </div>

          </div>
        </td>
      </tr>

      <tr>
        <td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
            Sent by <strong>Reminders by Rajat</strong> &mdash; Never miss what matters.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Core reminder logic ──────────────────────────────────────────────────────

type EventRow = {
  id: string
  user_id: string
  title: string
  event_date: string
  is_recurring: boolean
  reminder_type: 'week_before' | '3_hours_before' | 'both' | null
  reminder_sent_week: boolean
  reminder_sent_hours: boolean
}

type ProfileRow = {
  id: string
  email: string
  full_name: string
}

async function runReminders(): Promise<{ sent: number; reset: number }> {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const resend = new Resend(process.env.RESEND_API_KEY)
  const todayIST = toISTDateStr(new Date())

  const { data: allEvents, error: eventsError } = await adminClient
    .from('events')
    .select('*')

  if (eventsError) throw new Error(`Events fetch failed: ${eventsError.message}`)
  if (!allEvents?.length) return { sent: 0, reset: 0 }

  const events = allEvents as EventRow[]

  // ── Step 1: Reset flags for recurring events whose occurrence has passed ──
  const toReset = events.filter((event) => {
    if (!event.is_recurring) return false
    if (!event.reminder_sent_week && !event.reminder_sent_hours) return false
    const eventDateIST = toISTDateStr(new Date(event.event_date))
    return todayIST > thisYearOccurrenceIST(eventDateIST, todayIST)
  })

  for (const event of toReset) {
    await adminClient
      .from('events')
      .update({
        reminder_sent_week: false,
        reminder_sent_hours: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id)
  }

  // ── Step 2: Find events needing a reminder today ──
  const needsReminder = events.filter((event) => {
    if (!event.reminder_type) return false

    const needsWeek =
      (event.reminder_type === 'week_before' || event.reminder_type === 'both') &&
      !event.reminder_sent_week &&
      getReminderDayIST(event, 'week_before', todayIST) === todayIST

    const needsHours =
      (event.reminder_type === '3_hours_before' || event.reminder_type === 'both') &&
      !event.reminder_sent_hours &&
      getReminderDayIST(event, '3_hours_before', todayIST) === todayIST

    return needsWeek || needsHours
  })

  if (!needsReminder.length) return { sent: 0, reset: toReset.length }

  // ── Step 3: Fetch profiles for involved users ──
  const userIds = [...new Set(needsReminder.map((e) => e.user_id))]
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  const profileMap = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
  )

  // ── Step 4: Send emails ──
  let sent = 0

  for (const event of needsReminder) {
    const profile = profileMap.get(event.user_id)
    if (!profile?.email) continue

    const eventDateIST = toISTDateStr(new Date(event.event_date))
    const nextOcc = nextOccurrenceIST(eventDateIST, event.is_recurring, todayIST)
    const daysUntil = daysBetween(todayIST, nextOcc)
    const milestone = event.is_recurring
      ? milestoneText(event.title, eventDateIST, nextOcc)
      : ''

    // Determine which reminder type is firing today
    const firingWeek =
      (event.reminder_type === 'week_before' || event.reminder_type === 'both') &&
      !event.reminder_sent_week &&
      getReminderDayIST(event, 'week_before', todayIST) === todayIST

    const firingHours =
      (event.reminder_type === '3_hours_before' || event.reminder_type === 'both') &&
      !event.reminder_sent_hours &&
      getReminderDayIST(event, '3_hours_before', todayIST) === todayIST

    const { error: emailError } = await resend.emails.send({
      from: 'Reminders by Rajat <reminders@remindersbyrajat.xyz>',
      to: [profile.email],
      subject: `Reminder: ${event.title} is coming up!`,
      html: buildEmailHTML({
        recipientName: profile.full_name,
        eventTitle: event.title,
        nextOccIST: nextOcc,
        milestone,
        daysUntil,
      }),
    })

    if (emailError) {
      console.error(`Email failed for event ${event.id}:`, emailError)
      continue
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (firingHours) updates.reminder_sent_hours = true
    if (firingWeek) updates.reminder_sent_week = true

    await adminClient.from('events').update(updates).eq('id', event.id)
    sent++
  }

  return { sent, reset: toReset.length }
}

// ─── Auth check ───────────────────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const authHeader = request.headers.get('authorization')
  return isVercelCron || (!!cronSecret && authHeader === `Bearer ${cronSecret}`)
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Reminder job error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle

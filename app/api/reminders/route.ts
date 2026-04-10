import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { type NextRequest, NextResponse } from 'next/server'

const IST = 'Asia/Kolkata'

// ─── Date helpers (all operate on YYYY-MM-DD strings in IST) ─────────────────

/** Returns "YYYY-MM-DD" for a Date in IST. */
function toISTDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: IST })
}

/** Adds `days` to a YYYY-MM-DD string, returns YYYY-MM-DD. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(y, m - 1, d + days) // JS handles month overflow
  return [
    result.getFullYear(),
    String(result.getMonth() + 1).padStart(2, '0'),
    String(result.getDate()).padStart(2, '0'),
  ].join('-')
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

/** This calendar year's occurrence (regardless of whether it's past). */
function thisYearOccurrenceIST(eventDateIST: string, todayIST: string): string {
  const mm = eventDateIST.slice(5, 7)
  const dd = eventDateIST.slice(8, 10)
  return `${todayIST.slice(0, 4)}-${mm}-${dd}`
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

function buildEmailHTML(opts: {
  recipientName: string
  eventTitle: string
  nextOccIST: string
  milestone: string
  isToday: boolean
}): string {
  const { recipientName, eventTitle, nextOccIST, milestone, isToday } = opts
  const dateFormatted = formatDateLong(nextOccIST)
  const timelineHtml = isToday
    ? 'This event is <strong style="color:#E91E8C;">today</strong>!'
    : 'This event is coming up in <strong style="color:#E91E8C;">7 days</strong>.'

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

          <!-- Pink top accent bar -->
          <div style="height:4px;background:#E91E8C;"></div>

          <div style="padding:32px;">

            <!-- Tag -->
            <div style="display:inline-block;border:2px solid #1a1a2e;padding:4px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a2e;margin-bottom:24px;">
              EVENT REMINDER
            </div>

            <!-- Greeting -->
            <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a2e;line-height:1.5;">
              Hi ${recipientName ? recipientName.split(' ')[0] : 'there'},
            </p>

            <!-- Timeline message -->
            <p style="margin:0 0 28px 0;font-size:15px;color:#1a1a2e;line-height:1.6;">
              ${timelineHtml}
            </p>

            <!-- Divider -->
            <div style="height:2px;background:#1a1a2e;margin-bottom:28px;"></div>

            <!-- Event title -->
            <div style="margin-bottom:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;">
              EVENT
            </div>
            <div style="margin-bottom:${milestone ? '20px' : '20px'};font-size:22px;font-weight:700;text-transform:uppercase;color:#E91E8C;letter-spacing:0.5px;line-height:1.2;">
              ${eventTitle}
            </div>

            ${milestone ? `
            <!-- Milestone -->
            <div style="margin-bottom:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;">
              MILESTONE
            </div>
            <div style="margin-bottom:20px;font-size:17px;font-weight:700;color:#1a1a2e;">
              ${milestone}
            </div>
            ` : ''}

            <!-- Date -->
            <div style="background:#FFF8E7;border:2px solid #1a1a2e;padding:14px 16px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:4px;">DATE</div>
              <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${dateFormatted}</div>
            </div>

          </div>
        </td>
      </tr>

      <!-- Footer -->
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
  const sevenDaysIST = addDays(todayIST, 7)

  // Fetch all events
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
    const thisYearOcc = thisYearOccurrenceIST(eventDateIST, todayIST)
    return todayIST > thisYearOcc
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
    const eventDateIST = toISTDateStr(new Date(event.event_date))
    const nextOcc = nextOccurrenceIST(eventDateIST, event.is_recurring, todayIST)

    const needsWeek =
      (event.reminder_type === 'week_before' || event.reminder_type === 'both') &&
      !event.reminder_sent_week &&
      nextOcc === sevenDaysIST

    const needsHours =
      (event.reminder_type === '3_hours_before' || event.reminder_type === 'both') &&
      !event.reminder_sent_hours &&
      nextOcc === todayIST

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
    const isToday = nextOcc === todayIST
    const milestone = event.is_recurring
      ? milestoneText(event.title, eventDateIST, nextOcc)
      : ''

    const { error: emailError } = await resend.emails.send({
      from: 'Reminders by Rajat <onboarding@resend.dev>',
      to: [profile.email],
      subject: `Reminder: ${event.title} is coming up!`,
      html: buildEmailHTML({
        recipientName: profile.full_name,
        eventTitle: event.title,
        nextOccIST: nextOcc,
        milestone,
        isToday,
      }),
    })

    if (emailError) {
      console.error(`Email failed for event ${event.id}:`, emailError)
      continue
    }

    // Mark the appropriate flag as sent
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (isToday) updates.reminder_sent_hours = true
    else updates.reminder_sent_week = true

    await adminClient.from('events').update(updates).eq('id', event.id)
    sent++
  }

  return { sent, reset: toReset.length }
}

// ─── Auth check ───────────────────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  // Vercel automatically adds this header for cron invocations
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

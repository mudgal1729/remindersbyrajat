export type Event = {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string
  is_recurring: boolean
  reminder_type: 'week_before' | '3_hours_before' | 'both' | null
  reminder_sent_week: boolean
  reminder_sent_hours: boolean
  created_at: string
  updated_at: string
}

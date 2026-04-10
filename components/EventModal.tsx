'use client'

import { useState, useEffect } from 'react'
import { type Event } from '@/lib/types'
import { CloseIcon, CheckIcon } from '@/components/icons'

type FormState = {
  title: string
  description: string
  is_recurring: boolean
  date: string
  time: string
  reminder_week: boolean
  reminder_hours: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  is_recurring: false,
  date: '',
  time: '',
  reminder_week: false,
  reminder_hours: false,
}

function formFromEvent(event: Event): FormState {
  const d = new Date(event.event_date)
  // Use local date parts so the date field matches what the user entered
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const date = `${year}-${month}-${day}`
  // Local midnight = no explicit time was set
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  const time = hasTime
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : ''
  return {
    title: event.title,
    description: event.description ?? '',
    is_recurring: event.is_recurring,
    date,
    time,
    reminder_week:
      event.reminder_type === 'week_before' || event.reminder_type === 'both',
    reminder_hours:
      event.reminder_type === '3_hours_before' || event.reminder_type === 'both',
  }
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Event>) => Promise<void>
  onDelete?: () => Promise<void>
  editingEvent?: Event | null
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`w-6 h-6 border-[2px] border-[#1a1a2e] flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
          checked ? 'bg-[#E91E8C]' : 'bg-white'
        }`}
      >
        {checked && <CheckIcon className="w-4 h-4 text-white" />}
      </div>
      <span className="text-[#1a1a2e] text-sm">{label}</span>
    </label>
  )
}

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <label className="block text-[#1a1a2e] text-xs font-bold uppercase tracking-wide mb-1.5">
      {children}
      {optional && (
        <span className="ml-1 font-normal normal-case text-[#999]">(Optional)</span>
      )}
    </label>
  )
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingEvent,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm(editingEvent ? formFromEvent(editingEvent) : EMPTY_FORM)
      setError('')
    }
  }, [isOpen, editingEvent])

  if (!isOpen) return null

  const set = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Event name is required.')
      return
    }
    if (!form.date) {
      setError('Please select a date.')
      return
    }
    setSaving(true)
    setError('')

    const dateTime = form.time
      ? new Date(`${form.date}T${form.time}`)
      : new Date(`${form.date}T00:00:00`)

    const reminder_type =
      form.reminder_week && form.reminder_hours
        ? 'both'
        : form.reminder_week
        ? 'week_before'
        : form.reminder_hours
        ? '3_hours_before'
        : null

    await onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      is_recurring: form.is_recurring,
      event_date: dateTime.toISOString(),
      reminder_type,
    })
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const isEdit = !!editingEvent

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26,26,46,0.5)' }}
    >
      <div className="bg-white border-[3px] border-[#1a1a2e] w-full max-w-[480px] shadow-[4px_4px_0px_#1a1a2e]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <h2
            className="text-xl font-bold uppercase tracking-wide text-[#1a1a2e]"
            style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
          >
            {isEdit ? 'Edit Event' : 'Add New Event'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 border-[3px] border-[#1a1a2e] flex items-center justify-center text-[#1a1a2e] hover:bg-[#1a1a2e] hover:text-white transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="h-[2px] bg-[#1a1a2e] mx-8" />

        {/* Form */}
        <div className="px-8 py-6 flex flex-col gap-5">
          {/* Event Name */}
          <div>
            <FieldLabel>Event Name</FieldLabel>
            <input
              className="input-underline"
              placeholder="e.g. Mom's Birthday"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          {/* Subtitle */}
          <div>
            <FieldLabel optional>Subtitle</FieldLabel>
            <input
              className="input-underline"
              placeholder="Add a short description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Recurring */}
          <Checkbox
            checked={form.is_recurring}
            onChange={(v) => set('is_recurring', v)}
            label="It's a recurring event"
          />

          {/* Date */}
          <div>
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              className="input-underline"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>

          {/* Time */}
          <div>
            <FieldLabel optional>Time</FieldLabel>
            <input
              type="time"
              className="input-underline"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
            />
          </div>

          {/* Reminders */}
          <div>
            <FieldLabel>Send Email Reminder</FieldLabel>
            <div className="flex flex-col gap-3 mt-2">
              <Checkbox
                checked={form.reminder_week}
                onChange={(v) => set('reminder_week', v)}
                label="1 week before"
              />
              <Checkbox
                checked={form.reminder_hours}
                onChange={(v) => set('reminder_hours', v)}
                label="3 hours before"
              />
            </div>
          </div>

          {error && (
            <p className="text-[#E91E8C] text-sm font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          {/* Delete (edit mode only) */}
          {isEdit && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-white text-red-600 border-[3px] border-red-600 px-5 py-2.5 font-bold uppercase tracking-wide text-sm cursor-pointer hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="bg-white text-[#1a1a2e] border-[3px] border-[#1a1a2e] px-5 py-2.5 font-bold uppercase tracking-wide text-sm cursor-pointer hover:bg-[#1a1a2e] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#E91E8C] text-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] px-5 py-2.5 font-bold uppercase tracking-wide text-sm cursor-pointer hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

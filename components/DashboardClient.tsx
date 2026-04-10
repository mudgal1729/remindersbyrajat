'use client'

import { useState } from 'react'
import { type Event } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { sortByNextOccurrence, getNextOccurrence } from '@/lib/eventUtils'
import EventCard from '@/components/EventCard'
import EventModal from '@/components/EventModal'
import { CalendarIcon } from '@/components/icons'

type Props = {
  initialEvents: Event[]
  userId: string
}

export default function DashboardClient({ initialEvents, userId }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const supabase = createClient()

  const refreshEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
    if (data) setEvents(data as Event[])
  }

  const openAdd = () => {
    setEditingEvent(null)
    setModalOpen(true)
  }

  const openEdit = (event: Event) => {
    setEditingEvent(event)
    setModalOpen(true)
  }

  const handleSave = async (data: Partial<Event>) => {
    if (editingEvent) {
      await supabase
        .from('events')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editingEvent.id)
    } else {
      await supabase.from('events').insert({ ...data, user_id: userId })
    }
    await refreshEvents()
    setModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    await refreshEvents()
    setModalOpen(false)
  }

  const sorted = sortByNextOccurrence(events)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingCount = events.filter(
    (e) => getNextOccurrence(e) >= today
  ).length

  const hasEvents = events.length > 0

  return (
    <>
      <div className="min-h-screen bg-[#FFF8E7]">
        <div className={`max-w-5xl mx-auto px-6 py-10 ${hasEvents ? 'pb-28 md:pb-10' : ''}`}>

          {/* ── Empty state ── */}
          {!hasEvents ? (
            <div className="bg-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] p-12 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 bg-[#E91E8C] border-[3px] border-[#1a1a2e] flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2
                  className="text-xl font-bold uppercase text-[#1a1a2e] tracking-wide mb-2"
                  style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
                >
                  Welcome to Your Event Manager!
                </h2>
                <p className="text-[#1a1a2e] text-sm max-w-sm mx-auto">
                  Add your first event and get email reminders when it matters most.
                </p>
              </div>
              <button
                onClick={openAdd}
                className="bg-[#E91E8C] text-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] px-6 py-3 font-bold uppercase tracking-wide text-sm cursor-pointer hover:brightness-110 transition-all"
              >
                + Create Your First Event
              </button>
            </div>
          ) : (
            <>
              {/* ── Header row (events exist) ── */}
              <div className="flex items-start justify-between mb-10 gap-4 flex-wrap">
                <div>
                  <h1
                    className="text-3xl font-bold uppercase text-[#1a1a2e] tracking-wide"
                    style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
                  >
                    My Events
                  </h1>
                  <p className="text-[#1a1a2e] mt-1 text-sm">
                    You have {upcomingCount} upcoming event{upcomingCount === 1 ? '' : 's'}
                  </p>
                </div>

                {/* Desktop-only add button */}
                <button
                  onClick={openAdd}
                  className="hidden md:block bg-[#E91E8C] text-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] px-6 py-3 font-bold uppercase tracking-wide text-sm cursor-pointer hover:brightness-110 transition-all whitespace-nowrap flex-shrink-0"
                >
                  + Add Event
                </button>
              </div>

              {/* ── Section label ── */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-[#E91E8C]" />
                <h2
                  className="text-sm font-bold uppercase tracking-widest text-[#1a1a2e]"
                  style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
                >
                  Upcoming Events
                </h2>
              </div>

              {/* ── Events grid ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sorted.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile fixed bottom bar (events exist only) ── */}
      {hasEvents && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-[#FFF8E7] border-t-[3px] border-[#1a1a2e] p-4">
          <button
            onClick={openAdd}
            className="w-full bg-[#E91E8C] text-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] py-4 font-bold uppercase tracking-wide text-sm cursor-pointer hover:brightness-110 transition-all"
          >
            + Add Event
          </button>
        </div>
      )}

      <EventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={editingEvent ? () => handleDelete(editingEvent.id) : undefined}
        editingEvent={editingEvent}
      />
    </>
  )
}

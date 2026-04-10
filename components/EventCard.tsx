'use client'

import { useState, useEffect, useRef } from 'react'
import { type Event } from '@/lib/types'
import { formatCardDate, getCountdownBadge, type CountdownVariant } from '@/lib/eventUtils'
import { DotsIcon } from '@/components/icons'

type Props = {
  event: Event
  onEdit: (event: Event) => void
  onDelete: (id: string) => void
}

function CountdownBadge({
  label,
  variant,
}: {
  label: string
  variant: CountdownVariant
}) {
  const base =
    'inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest'

  if (variant === 'today') {
    return (
      <span className={`${base} bg-[#E91E8C] text-white border-[2px] border-[#1a1a2e] shadow-[2px_2px_0px_#1a1a2e]`}>
        {label}
      </span>
    )
  }
  if (variant === 'tomorrow') {
    return (
      <span className={`${base} bg-[#E91E8C] text-white border-[2px] border-[#1a1a2e]`}>
        {label}
      </span>
    )
  }
  if (variant === 'days') {
    return (
      <span className={`${base} bg-[#1a1a2e] text-white`}>
        {label}
      </span>
    )
  }
  if (variant === 'months-near') {
    return (
      <span className={`${base} bg-white text-[#1a1a2e] border-[2px] border-[#1a1a2e]`}>
        {label}
      </span>
    )
  }
  // months-far
  return (
    <span className={`${base} bg-white text-[#999] border-[2px] border-[#ccc]`}>
      {label}
    </span>
  )
}

export default function EventCard({ event, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const badge = getCountdownBadge(event)

  return (
    <div className="bg-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] p-5 flex flex-col gap-2 relative">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold uppercase text-[#1a1a2e] text-base leading-tight"
            style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
          >
            {event.title}
          </h3>
          {event.description && (
            <p className="text-[#555] text-sm mt-1 leading-snug">{event.description}</p>
          )}
        </div>

        {/* Three-dot menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 flex items-center justify-center border-[2px] border-transparent hover:border-[#1a1a2e] text-[#1a1a2e] cursor-pointer transition-colors"
            aria-label="Event options"
          >
            <DotsIcon className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 bg-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] min-w-[120px]">
              <button
                onClick={() => { setMenuOpen(false); onEdit(event) }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-[#1a1a2e] hover:bg-[#FFF8E7] cursor-pointer"
              >
                Edit
              </button>
              <div className="h-[1px] bg-[#1a1a2e]" />
              <button
                onClick={() => { setMenuOpen(false); onDelete(event.id) }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-[#E91E8C] hover:bg-[#FFF8E7] cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date / milestone */}
      <p className="text-[#666] text-sm font-medium">{formatCardDate(event)}</p>

      {/* Countdown badge */}
      {badge && <CountdownBadge label={badge.label} variant={badge.variant} />}
    </div>
  )
}

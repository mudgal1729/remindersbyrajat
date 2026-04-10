'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { BellIcon } from '@/components/icons'

export default function Navbar() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header>
      <div className="bg-white w-full flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E91E8C] border-[3px] border-[#1a1a2e] flex items-center justify-center flex-shrink-0">
            <BellIcon className="w-5 h-5 text-white" />
          </div>
          <span
            className="text-[#1a1a2e] font-bold uppercase tracking-wide text-lg"
            style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
          >
            Reminders by Rajat
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="bg-white text-[#1a1a2e] border-[3px] border-[#1a1a2e] px-5 py-2 font-bold uppercase tracking-wide text-sm cursor-pointer hover:bg-[#1a1a2e] hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
      <div className="h-[3px] bg-[#E91E8C] w-full" />
    </header>
  )
}

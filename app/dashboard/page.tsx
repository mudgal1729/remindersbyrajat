import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Event } from '@/lib/types'
import Navbar from '@/components/Navbar'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('event_date', { ascending: true })

  return (
    <div className="min-h-screen bg-[#FFF8E7]">
      <Navbar />
      <DashboardClient
        initialEvents={(events as Event[]) ?? []}
        userId={user.id}
      />
    </div>
  )
}

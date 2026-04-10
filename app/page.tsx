import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pickTagline } from '@/lib/taglines'
import AuthForm from '@/components/AuthForm'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return <AuthForm tagline={pickTagline()} />
}

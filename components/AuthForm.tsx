'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { BellIcon } from '@/components/icons'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[#1a1a2e] text-xs font-bold uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

export default function AuthForm({ tagline }: { tagline: string }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const clearMessages = () => {
    setError('')
    setInfoMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    clearMessages()

    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setSuccessMessage(
        "Check your email! We've sent you a confirmation link to verify your account."
      )
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      const isUnconfirmed =
        err.message.toLowerCase().includes('email not confirmed') ||
        err.code === 'email_not_confirmed'
      if (isUnconfirmed) {
        setInfoMessage(
          'Please confirm your email first. Check your inbox for the verification link.'
        )
      } else {
        setError(err.message)
      }
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  const toggleMode = () => {
    setIsSignUp((v) => !v)
    clearMessages()
    setName('')
    setEmail('')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-[#FFF8E7] flex flex-col items-center justify-center p-4">
      {/* Logo + tagline */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-14 h-14 bg-[#E91E8C] border-[3px] border-[#1a1a2e] flex items-center justify-center mb-4 shadow-[4px_4px_0px_#1a1a2e]">
          <BellIcon className="w-7 h-7 text-white" />
        </div>
        <h1
          className="text-3xl font-bold uppercase text-[#1a1a2e] tracking-wide text-center"
          style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
        >
          Reminders by Rajat
        </h1>
        <p className="text-[#1a1a2e] mt-2 text-base text-center max-w-xs">{tagline}</p>
      </div>

      {/* Auth card */}
      <div className="bg-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] p-10 w-full max-w-[420px]">
        <h2
          className="text-2xl font-bold uppercase text-[#1a1a2e] tracking-wide mb-8"
          style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
        >
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        {successMessage && (
          <div className="mb-6 border-[2px] border-[#0D9488] bg-[#F0FDFA] p-4">
            <p className="text-[#0D9488] text-sm font-medium leading-snug">{successMessage}</p>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 border-[2px] border-[#0891B2] bg-[#F0F9FF] p-4">
            <p className="text-[#0891B2] text-sm font-medium leading-snug">{infoMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {isSignUp && (
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                className="input-underline"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              className="input-underline"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <FieldLabel>Password</FieldLabel>
            <input
              type="password"
              className="input-underline"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <p className="text-[#E91E8C] text-sm font-medium -mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E91E8C] text-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] py-3.5 font-bold uppercase tracking-wide text-sm cursor-pointer hover:brightness-110 disabled:opacity-50 transition-all mt-2"
          >
            {loading ? 'Please wait…' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#1a1a2e]">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                onClick={toggleMode}
                className="text-[#E91E8C] underline font-medium cursor-pointer bg-transparent border-none p-0"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={toggleMode}
                className="text-[#E91E8C] underline font-medium cursor-pointer bg-transparent border-none p-0"
              >
                Sign Up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

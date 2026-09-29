"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthShell, FormError, SecondaryLink, StatusCard, friendlyAuthError } from '@/components/auth/auth-ui'

const COOLDOWN = 30

export default function CheckEmailPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try { setEmail(sessionStorage.getItem('cs:pending-email')) } catch {}
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const resend = async () => {
    if (!email) return
    setSending(true)
    setError('')
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    setSending(false)
    if (resendError) {
      setError(friendlyAuthError(resendError, 'Could not resend the email. Please try again shortly.'))
      return
    }
    setSent(true)
    setCooldown(COOLDOWN)
  }

  return (
    <AuthShell>
      <StatusCard
        icon={<MailCheck className="h-8 w-8" />}
        title="Check your email"
        actions={<SecondaryLink href="/auth/signin">Back to sign in</SecondaryLink>}
      >
        <p>
          We sent a confirmation link to{' '}
          {email ? <strong className="text-slate-900">{email}</strong> : 'your email address'}.
          Click it to activate your account, then sign in.
        </p>
      </StatusCard>

      <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
        <p className="font-semibold text-slate-800">Didn’t get it?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>It can take a minute or two to arrive.</li>
          <li>Check your spam or promotions folder.</li>
          <li>
            Typo in your email?{' '}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-700">Sign up again</Link>
          </li>
        </ul>
        {email && (
          <div className="mt-4">
            <FormError>{error}</FormError>
            <button
              type="button"
              onClick={resend}
              disabled={sending || cooldown > 0}
              className="font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {sending ? 'Sending…' : cooldown > 0 ? `Sent. You can resend in ${cooldown}s` : sent ? 'Resend again' : 'Resend confirmation email'}
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  )
}

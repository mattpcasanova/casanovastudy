"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  AuthShell, AuthHeading, FormError, PasswordField, PrimaryButton, SecondaryLink, StatusCard,
  friendlyAuthError,
} from '@/components/auth/auth-ui'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidLink, setIsValidLink] = useState(true)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.substring(1))
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) setIsValidLink(false)
      })
      return
    }
    if (!hash.get('access_token') && hash.get('type') !== 'recovery') {
      // Direct visit: only valid if the recovery flow already made a session.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) setIsValidLink(false)
      })
    }
  }, [])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => router.push('/auth/signin'), 2500)
    return () => clearTimeout(t)
  }, [success, router])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Your password needs at least 6 characters.')
    setIsLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setIsLoading(false)
    if (updateError) {
      setError(friendlyAuthError(updateError, 'We couldn’t update your password. Please try again.'))
      return
    }
    setSuccess(true)
  }

  if (!isValidLink) {
    return (
      <AuthShell>
        <StatusCard
          icon={<KeyRound className="h-8 w-8" />}
          tone="red"
          title="This link has expired"
          actions={<SecondaryLink href="/auth/signin">Back to sign in</SecondaryLink>}
        >
          <p>Password reset links only work once and expire after a while. Request a new one from the sign-in page with “Forgot password?”.</p>
        </StatusCard>
      </AuthShell>
    )
  }

  if (success) {
    return (
      <AuthShell>
        <StatusCard
          icon={<CheckCircle2 className="h-8 w-8" />}
          tone="green"
          title="Password updated"
          actions={<SecondaryLink href="/auth/signin">Sign in now</SecondaryLink>}
        >
          <p>You can sign in with your new password. Taking you there…</p>
        </StatusCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeading title="Choose a new password" subtitle="Pick something you haven’t used before." />
      <FormError>{error}</FormError>
      <form onSubmit={handleReset} className="space-y-5">
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" showStrength disabled={isLoading} />
        <PrimaryButton type="submit" loading={isLoading} loadingText="Saving…">Save new password</PrimaryButton>
      </form>
    </AuthShell>
  )
}

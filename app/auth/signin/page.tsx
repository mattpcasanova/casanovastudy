"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  AuthShell, AuthHeading, ColegiaButton, Divider, Field, FormError, PasswordField, PrimaryButton,
  friendlyAuthError, safeNext,
} from '@/components/auth/auth-ui'

export default function SignInPage() {
  const router = useRouter()
  const { user, signIn, resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent] = useState(false)
  const [mode, setMode] = useState<'signin' | 'forgot' | 'forgot-sent'>('signin')
  const next = useRef('/')

  useEffect(() => {
    next.current = safeNext(new URLSearchParams(window.location.search).get('next'))
  }, [])

  // Already signed in (e.g. opened the page in another tab): skip the form.
  useEffect(() => {
    if (user) router.replace(next.current)
  }, [user, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnconfirmed(false)
    setIsLoading(true)
    try {
      await signIn(email.trim(), password)
      router.push(next.current)
    } catch (err) {
      const msg = (err as { message?: string })?.message?.toLowerCase() ?? ''
      setUnconfirmed(msg.includes('email not confirmed'))
      setError(friendlyAuthError(err, 'We couldn’t sign you in. Please try again.'))
      setIsLoading(false)
    }
  }

  const resendConfirmation = async () => {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    if (resendError) setError(friendlyAuthError(resendError, 'Could not resend the email.'))
    else setResent(true)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await resetPassword(email.trim())
      setMode('forgot-sent')
    } catch (err) {
      setError(friendlyAuthError(err, 'We couldn’t send the reset email. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  if (mode !== 'signin') {
    return (
      <AuthShell>
        <button
          type="button"
          onClick={() => { setMode('signin'); setError('') }}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>
        {mode === 'forgot' ? (
          <>
            <AuthHeading title="Reset your password" subtitle="Enter the email you signed up with and we’ll send you a link to choose a new password." />
            <FormError>{error}</FormError>
            <form onSubmit={handleForgot} className="space-y-5">
              <Field label="Email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              <PrimaryButton type="submit" loading={isLoading} loadingText="Sending…">Send reset link</PrimaryButton>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-100">
              <MailCheck className="h-8 w-8" />
            </div>
            <AuthHeading
              title="Check your inbox"
              subtitle={<>If an account exists for <strong className="text-slate-900">{email}</strong>, you’ll get a link to reset your password in a minute or two. Don’t see it? Check your spam folder.</>}
            />
          </div>
        )}
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeading title="Welcome back" subtitle="Sign in to pick up where you left off." />

      <ColegiaButton disabled={isLoading} />
      <Divider label="or sign in with email" />

      {error && <FormError>
        {error}
        {unconfirmed && email && (
          <span className="mt-2 block">
            {resent
              ? 'Sent! Check your inbox for a new confirmation link.'
              : <button type="button" onClick={resendConfirmation} className="font-semibold underline underline-offset-2">Resend confirmation email</button>}
          </span>
        )}
      </FormError>}

      <form onSubmit={handleSignIn} className="space-y-5">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!error && !unconfirmed}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={isLoading}
          labelAside={
            <button type="button" onClick={() => { setMode('forgot'); setError('') }} className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Forgot password?
            </button>
          }
        />
        <PrimaryButton type="submit" loading={isLoading} loadingText="Signing in…">Sign in</PrimaryButton>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        New to Casanova Study?{' '}
        <Link href="/auth/signup" className="font-semibold text-blue-600 hover:text-blue-700">Create an account</Link>
      </p>
    </AuthShell>
  )
}

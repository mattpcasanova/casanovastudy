"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthShell, SecondaryLink, StatusCard } from '@/components/auth/auth-ui'

// Landing page for the email-confirmation link. Supabase sends either a PKCE
// ?code= or (older links) tokens in the hash. Either way the email is verified;
// auto sign-in is unreliable (truncated refresh tokens), so we send people to
// sign in.
export default function ConfirmEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.substring(1))
        const query = new URLSearchParams(window.location.search)
        const urlError = query.get('error_description') || query.get('error') || hash.get('error_description')
        if (urlError) throw new Error(urlError)

        const code = query.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          setStatus('success')
          return
        }
        if (hash.get('type') === 'signup' && hash.get('access_token')) {
          setStatus('success')
          return
        }
        throw new Error('This confirmation link is incomplete. Open the link from your email again.')
      } catch (err) {
        const msg = (err as { message?: string })?.message || ''
        setErrorMessage(/expired|invalid/i.test(msg)
          ? 'This confirmation link has expired or was already used. If your account is already confirmed, just sign in. If not, sign in and we’ll offer to resend the link.'
          : msg || 'We couldn’t confirm your email.')
        setStatus('error')
      }
    }
    const timer = setTimeout(confirmEmail, 100) // let the URL settle
    return () => clearTimeout(timer)
  }, [])

  return (
    <AuthShell>
      {status === 'loading' && (
        <StatusCard icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Confirming your email…">
          <p>This only takes a moment.</p>
        </StatusCard>
      )}
      {status === 'success' && (
        <StatusCard
          icon={<CheckCircle2 className="h-8 w-8" />}
          tone="green"
          title="You’re all set!"
          actions={
            <Link href="/auth/signin" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-[0.95rem] font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Sign in to get started
            </Link>
          }
        >
          <p>Your email is confirmed and your account is active.</p>
        </StatusCard>
      )}
      {status === 'error' && (
        <StatusCard
          icon={<XCircle className="h-8 w-8" />}
          tone="red"
          title="Link didn’t work"
          actions={<SecondaryLink href="/auth/signin">Go to sign in</SecondaryLink>}
        >
          <p>{errorMessage}</p>
        </StatusCard>
      )}
    </AuthShell>
  )
}

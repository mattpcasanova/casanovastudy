"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthShell, SecondaryLink, StatusCard } from '@/components/auth/auth-ui'

export default function CleverCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setStatus('error')
        setError(errorParam === 'access_denied'
          ? 'Access was denied. Please try again or use email/password login.'
          : `Authentication failed: ${errorParam}`)
        return
      }

      if (!code) {
        setStatus('error')
        setError('No authorization code received from Clever.')
        return
      }

      try {
        // Exchange code for user info via our API
        const response = await fetch('/api/auth/clever', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to authenticate with Clever')
        }

        setStatus('success')

        // If we got a magic link, redirect to it to complete sign-in
        if (data.magicLink) {
          window.location.href = data.magicLink
          return
        }

        // Otherwise redirect to home
        setTimeout(() => {
          router.push('/')
        }, 1500)

      } catch (err: any) {
        setStatus('error')
        setError(err.message || 'An error occurred during authentication')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <AuthShell>
      {status === 'loading' && (
        <StatusCard icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Signing you in…">
          <p>Connecting to your school account.</p>
        </StatusCard>
      )}
      {status === 'success' && (
        <StatusCard icon={<CheckCircle2 className="h-8 w-8" />} tone="green" title="Welcome!">
          <p>Taking you to Casanova Study…</p>
        </StatusCard>
      )}
      {status === 'error' && (
        <StatusCard
          icon={<AlertCircle className="h-8 w-8" />}
          tone="red"
          title="School sign-in didn’t work"
          actions={<SecondaryLink href="/auth/signin">Back to sign in</SecondaryLink>}
        >
          <p>{error}</p>
        </StatusCard>
      )}
    </AuthShell>
  )
}

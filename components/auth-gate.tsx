"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'
import { signInPath } from '@/lib/sign-in-path'
import { useConsentStep } from '@/lib/use-consent'

// Pages a student can open before a parent approves (COPPA): the consent
// screen itself, the legal pages and their account (to delete it).
const OPEN_BEFORE_CONSENT = ['/consent', '/privacy', '/terms', '/account']

interface AuthGateProps {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const consentStep = useConsentStep(user)
  const consentOpen = OPEN_BEFORE_CONSENT.some((p) => pathname?.startsWith(p))

  useEffect(() => {
    // Don't redirect if still loading or on auth pages
    if (loading) return
    if (pathname?.startsWith('/auth/')) return

    // Redirect to sign-in if not authenticated
    if (!user) {
      // Come back here after signing in (e.g. a shared guide link).
      router.push(signInPath())
      return
    }
    // Students under 13 (or without a birth date) finish the consent step first.
    if (consentStep && consentStep !== 'ok' && !consentOpen) router.replace('/consent')
  }, [user, loading, router, pathname, consentStep, consentOpen])

  // Show loading state (and while a student's consent step is being checked)
  if (loading || (user && !consentOpen && consentStep !== 'ok')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }

  // Don't render children if not authenticated (will redirect)
  if (!user && !pathname?.startsWith('/auth/')) {
    return null
  }

  return <>{children}</>
}

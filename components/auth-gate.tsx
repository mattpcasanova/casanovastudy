"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'
import { signInPath } from '@/lib/sign-in-path'

interface AuthGateProps {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if still loading or on auth pages
    if (loading) return
    if (pathname?.startsWith('/auth/')) return

    // Redirect to sign-in if not authenticated
    if (!user) {
      // Come back here after signing in (e.g. a shared guide link).
      router.push(signInPath())
    }
  }, [user, loading, router, pathname])

  // Show loading state
  if (loading) {
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

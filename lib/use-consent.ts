"use client"

// The signed-in student's consent step (lib/consent-rules.ts), fetched once per
// session from /api/consent. Teachers never need it, so they skip the request.

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import type { ConsentStep } from '@/lib/consent-rules'

let cached: { userId: string; step: ConsentStep } | null = null

export function setConsentStep(userId: string, step: ConsentStep) {
  cached = { userId, step }
}

export function useConsentStep(user: { id: string; user_type?: string } | null): ConsentStep | null {
  const known = user && (user.user_type !== 'student' ? 'ok' : cached?.userId === user.id ? cached.step : null)
  const [step, setStep] = useState<ConsentStep | null>(known ?? null)

  useEffect(() => {
    if (!user) return
    if (user.user_type !== 'student') { setStep('ok'); return }
    if (cached?.userId === user.id) { setStep(cached.step); return }
    let alive = true
    void (async () => {
      try {
        const res = await authFetch('/api/consent', { cache: 'no-store' })
        const data = await res.json()
        if (!alive) return
        const next: ConsentStep = res.ok ? data.step : 'ok' // never lock someone out on a network error
        cached = { userId: user.id, step: next }
        setStep(next)
      } catch {
        if (alive) setStep('ok')
      }
    })()
    return () => { alive = false }
  }, [user])

  return step
}

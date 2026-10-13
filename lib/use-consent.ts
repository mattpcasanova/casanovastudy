"use client"

// The signed-in account's consent step (lib/consent-rules.ts), fetched once per
// session from /api/consent. Teachers are checked too (picking "teacher" must
// not skip the birth date / parent step).

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import type { ConsentStep } from '@/lib/consent-rules'

let cached: { userId: string; step: ConsentStep } | null = null

export function setConsentStep(userId: string, step: ConsentStep) {
  cached = { userId, step }
}

export function useConsentStep(user: { id: string } | null): ConsentStep | null {
  const known = user && cached?.userId === user.id ? cached.step : null
  const [step, setStep] = useState<ConsentStep | null>(known ?? null)

  useEffect(() => {
    if (!user) return
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

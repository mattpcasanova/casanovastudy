"use client"

// The signed-in user's plan (free / Premium) and usage, plus the one Premium
// dialog the whole app shares. Components call usePlan() to read limits and
// openPremium(block) when a route says no (or a locked option is picked).
// Rules: lib/plan-rules.ts. Server: lib/plans.ts, /api/plan, /api/plan/redeem.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Crown, Loader2, Ticket } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { PLANS_ENABLED } from '@/lib/features'
import { authFetch } from '@/lib/auth-fetch'
import { cn } from '@/lib/utils'
import type { MeteredKind, PlanBlock, PlanTier } from '@/lib/plan-rules'

export interface PlanInfo {
  tier: PlanTier
  premiumUntil: string | null
  source: string | null
  usage: Record<MeteredKind, { used: number; limit: number; resetsAt: string | null }>
}

interface PlanContextValue {
  plan: PlanInfo | null
  isPremium: boolean
  refresh: () => Promise<void>
  /** Opens the Premium dialog, optionally explaining why (a 403 body from a metered route). */
  openPremium: (block?: PlanBlock | null) => void
  openRedeem: () => void
}

const PlanContext = createContext<PlanContextValue | null>(null)

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider')
  return ctx
}

/** "Tue, Oct 6 at 3:40 PM" (or "3:40 PM" if it's today). */
export function formatReset(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`
}

export function formatDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : ''
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [dialog, setDialog] = useState<{ block: PlanBlock | null; redeemOnly: boolean } | null>(null)

  const refresh = useCallback(async () => {
    // While plans are off, plan stays null and every badge, count and menu line hides.
    if (!user || !PLANS_ENABLED) { setPlan(null); return }
    try {
      const res = await authFetch('/api/plan', { cache: 'no-store' })
      if (res.ok) setPlan(await res.json())
    } catch { /* offline: keep what we had */ }
  }, [user])

  useEffect(() => { void refresh() }, [refresh])

  const value = useMemo<PlanContextValue>(() => ({
    plan,
    isPremium: plan?.tier === 'premium',
    refresh,
    openPremium: (block) => setDialog({ block: block ?? null, redeemOnly: false }),
    openRedeem: () => setDialog({ block: null, redeemOnly: true }),
  }), [plan, refresh])

  return (
    <PlanContext.Provider value={value}>
      {children}
      <PremiumDialog
        state={dialog}
        plan={plan}
        onClose={() => setDialog(null)}
        onRedeemed={refresh}
      />
    </PlanContext.Provider>
  )
}

const PERKS = [
  'All 8 formats, including Practice, Study Plan, Cheat Sheet and Timeline',
  'Long guides and Hard questions',
  'The AI assistant in the custom builder',
  'Up to 60 guides a month and 40 explanations a day',
  'Exam grading for teachers',
]

function PremiumDialog({ state, plan, onClose, onRedeemed }: {
  state: { block: PlanBlock | null; redeemOnly: boolean } | null
  plan: PlanInfo | null
  onClose: () => void
  onRedeemed: () => Promise<void>
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redeemedUntil, setRedeemedUntil] = useState<string | null>(null)

  useEffect(() => {
    if (!state) return
    setCode(''); setError(null); setRedeemedUntil(null)
  }, [state])

  const redeem = async () => {
    if (!code.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const res = await authFetch('/api/plan/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not redeem that code.')
      setRedeemedUntil(data.premiumUntil)
      await onRedeemed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not redeem that code.')
    } finally {
      setBusy(false)
    }
  }

  const block = state?.block ?? null
  const premium = plan?.tier === 'premium'
  const reset = formatReset(block?.resetsAt)
  const title = redeemedUntil
    ? "You're on Premium"
    : state?.redeemOnly
      ? 'Redeem a code'
      : block?.code === 'limit_reached'
        ? premium ? "You've reached a limit" : "You've hit your free limit"
        : block
          ? "That's part of Premium"
          : 'Casanova Study Premium'

  return (
    <Dialog open={!!state} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            {state?.redeemOnly && !redeemedUntil ? <Ticket className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
          </span>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {!redeemedUntil && block && (
            <DialogDescription className="text-base text-slate-600">
              {block.error}
              {reset && (block.kind === 'guide' ? ` Your next one unlocks ${reset}.` : block.kind === 'explain' ? ` More unlock ${reset}.` : '')}
            </DialogDescription>
          )}
        </DialogHeader>

        {redeemedUntil ? (
          <div className="space-y-4">
            <p className="text-slate-700">Your code worked. You have Premium until <span className="font-semibold">{formatDate(redeemedUntil)}</span>.</p>
            <button type="button" onClick={onClose} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">Start studying</button>
          </div>
        ) : (
          <div className="space-y-5">
            {!state?.redeemOnly && !premium && (
              <div>
                <ul className="space-y-2">
                  {PERKS.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{p}</li>
                  ))}
                </ul>
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Premium is coming soon. If your teacher gave you a code, enter it below.</p>
              </div>
            )}
            {!premium || state?.redeemOnly ? (
              <form onSubmit={(e) => { e.preventDefault(); void redeem() }} className="space-y-2">
                <label htmlFor="premium-code" className="text-sm font-semibold text-slate-800">Have a code?</label>
                <div className="flex gap-2">
                  <input
                    id="premium-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CHEM-2027"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={40}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase tracking-wide outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button type="submit" disabled={!code.trim() || busy} className={cn('inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50')}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Redeem
                  </button>
                </div>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </form>
            ) : (
              <p className="text-sm text-slate-600">You have Premium until {formatDate(plan?.premiumUntil)}.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

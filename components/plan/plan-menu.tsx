"use client"

import { Ticket } from 'lucide-react'
import { PremiumMark } from './premium-mark'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { formatDate, usePlan } from './plan-provider'

/** Plan summary + "Redeem a code" for the account menu. */
export function PlanMenuItems() {
  const { plan, isPremium, openPremium, openRedeem } = usePlan()
  if (!plan) return null
  const g = plan.usage.guide
  const e = plan.usage.explain
  return (
    <>
      <DropdownMenuSeparator />
      <button type="button" onClick={() => openPremium()} className="block w-full px-3 py-2 text-left hover:bg-slate-50">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <PremiumMark className={isPremium ? undefined : 'opacity-60 grayscale'} />
          {isPremium ? 'Premium' : 'Free plan'}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {isPremium
            ? `Until ${formatDate(plan.premiumUntil)}`
            : `${Math.max(0, g.limit - g.used)} of ${g.limit} guides left this week · ${Math.max(0, e.limit - e.used)} of ${e.limit} explanations left today`}
        </span>
      </button>
      <DropdownMenuItem onClick={openRedeem} className="cursor-pointer">
        <Ticket className="mr-2 h-4 w-4 flex-shrink-0" />
        Redeem a code
      </DropdownMenuItem>
    </>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { PLANS_ENABLED } from '@/lib/features'
import { getPlan, usageSummary } from '@/lib/plans'

// The signed-in user's plan and how much of their limits they've used.
export async function GET(request: NextRequest) {
  if (!PLANS_ENABLED) return NextResponse.json({ error: 'Not available yet.' }, { status: 404 })
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const plan = await getPlan(user.id)
  const usage = await usageSummary(user.id, plan.tier)
  return NextResponse.json({ ...plan, usage }, { headers: { 'Cache-Control': 'no-store' } })
}

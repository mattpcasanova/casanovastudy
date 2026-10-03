import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { PLANS_ENABLED } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase-server'

// Redeem an access code for Premium (codes are made with scripts/plans.ts).
const MESSAGES: Record<string, string> = {
  invalid_code: "That code doesn't exist. Check the spelling and try again.",
  code_expired: 'That code has expired.',
  code_used_up: 'That code has already been used the maximum number of times.',
  already_redeemed: "You've already used that code.",
}
const attempts = new Map<string, number[]>() // per-instance brake on code guessing

export async function POST(request: NextRequest) {
  if (!PLANS_ENABLED) return NextResponse.json({ error: 'Not available yet.' }, { status: 404 })
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in to redeem a code.' }, { status: 401 })

  const now = Date.now()
  const recent = (attempts.get(user.id) ?? []).filter((t) => t > now - 3_600_000)
  if (recent.length >= 10) return NextResponse.json({ error: 'Too many tries. Please wait a bit and try again.' }, { status: 429 })
  attempts.set(user.id, [...recent, now])

  let code = ''
  try { code = String((await request.json()).code ?? '').trim().toUpperCase() } catch { /* handled below */ }
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) return NextResponse.json({ error: MESSAGES.invalid_code }, { status: 400 })

  const { data, error } = await createAdminClient().rpc('redeem_access_code', { p_user: user.id, p_code: code })
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    if (!key) console.error('Redeem error:', error)
    return NextResponse.json({ error: key ? MESSAGES[key] : 'Could not redeem that code. Please try again.' }, { status: key ? 400 : 500 })
  }
  return NextResponse.json({ premiumUntil: data })
}

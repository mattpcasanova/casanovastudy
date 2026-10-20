import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { confirmSchoolEmail, verificationKey } from '@/lib/teachers/verification'
import { checkEmailLink, normalizeEmail } from '@/lib/teachers/verification-rules'

// POST { u, e, x, t }: the signed link from the confirm email. POST only, so
// mail scanners opening the link don't confirm it.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const userId = String(body?.u ?? '')
  const email = normalizeEmail(body?.e)
  const expires = Number(body?.x)
  const token = String(body?.t ?? '')
  if (!userId || !email || !Number.isFinite(expires) || !token) return NextResponse.json({ error: 'This link is incomplete.' }, { status: 400 })
  const check = checkEmailLink(verificationKey(), { userId, email, expires, token })
  if (check === 'bad') return NextResponse.json({ error: "This link doesn't work. Send a new one from your home page." }, { status: 400 })
  if (check === 'expired') return NextResponse.json({ error: 'This link has expired. Send a new one from your home page.' }, { status: 410 })
  const result = await confirmSchoolEmail(createAdminClient(), userId, email)
  return NextResponse.json(result)
}

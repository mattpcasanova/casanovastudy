import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { getTeacherVerification, startVerification } from '@/lib/teachers/verification'
import { EmailNotConfiguredError } from '@/lib/email/send'

// GET: the signed-in teacher's verification state.
// POST { schoolEmail, schoolName }: send the confirm link (or approve at once
// when they signed in with Google on that same school address).

const sends = new Map<string, number[]>()

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const supabase = createAdminClient()
  const v = await getTeacherVerification(supabase, user.id)
  return NextResponse.json({ ...v, loginEmail: user.email ?? null })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('user_profiles').select('user_type').eq('id', user.id).maybeSingle()
  if (profile?.user_type !== 'teacher') return NextResponse.json({ error: 'Only teacher accounts are verified' }, { status: 403 })

  const now = Date.now()
  const recent = (sends.get(user.id) ?? []).filter((t) => now - t < 60 * 60 * 1000)
  if (recent.length >= 5) return NextResponse.json({ error: 'Too many emails sent. Try again in an hour.' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  try {
    const result = await startVerification(supabase, user.id, { schoolEmail: String(body?.schoolEmail ?? ''), schoolName: String(body?.schoolName ?? '') })
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    if (result.state === 'sent') sends.set(user.id, [...recent, now])
    return NextResponse.json({ state: result.state, ...(await getTeacherVerification(supabase, user.id)) })
  } catch (e) {
    console.error('Teacher verification failed:', e)
    const msg = e instanceof EmailNotConfiguredError ? 'Email is not set up on this site yet.' : "Couldn't send the email. Try again."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

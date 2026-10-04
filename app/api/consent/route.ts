import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { getConsentState, hashToken, newToken } from '@/lib/consent'
import { isEmail, isPlausibleBirthDate } from '@/lib/consent-rules'
import { sendEmail, EmailNotConfiguredError } from '@/lib/email/send'
import { parentConsentEmail } from '@/lib/email/templates'

// The student's side of parental consent (/consent page):
//   GET                                  -> what this account still needs
//   POST { action: 'birthdate', birthDate } -> record a missing birth date (once)
//   POST { action: 'request', parentEmail } -> email the parent an approval link
const sentBy = new Map<string, number[]>() // per-instance brake on resends

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const state = await getConsentState(user.id)
  return NextResponse.json({ step: state.step, parentEmail: state.parentEmail }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  let body: { action?: string; birthDate?: string; parentEmail?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const supabase = createAdminClient()
  const state = await getConsentState(user.id)

  if (body.action === 'birthdate') {
    if (state.step !== 'birthdate') return NextResponse.json({ error: 'Your birth date is already set.' }, { status: 400 })
    const birthDate = String(body.birthDate ?? '')
    if (!isPlausibleBirthDate(birthDate)) return NextResponse.json({ error: 'Please check your birth date, especially the year.' }, { status: 400 })
    await supabase.from('user_profiles').update({ birth_date: birthDate }).eq('id', user.id)
    const next = await getConsentState(user.id)
    return NextResponse.json({ step: next.step })
  }

  if (body.action === 'request') {
    if (state.step !== 'parent' && state.step !== 'pending') return NextResponse.json({ error: 'No parent approval is needed.' }, { status: 400 })
    const parentEmail = String(body.parentEmail ?? '').trim().toLowerCase()
    if (!isEmail(parentEmail)) return NextResponse.json({ error: 'Please enter your parent or guardian\'s email address.' }, { status: 400 })
    if (parentEmail === (user.email ?? '').toLowerCase()) return NextResponse.json({ error: 'That\'s your own email. Please enter a parent or guardian\'s email.' }, { status: 400 })

    const now = Date.now()
    const recent = (sentBy.get(user.id) ?? []).filter((t) => t > now - 3_600_000)
    if (recent.length >= 5) return NextResponse.json({ error: 'Too many emails sent. Please wait a bit and try again.' }, { status: 429 })
    sentBy.set(user.id, [...recent, now])

    const token = newToken()
    const { error } = await supabase.from('parental_consents').upsert({
      user_id: user.id, status: 'pending', parent_email: parentEmail, token_hash: hashToken(token),
      requested_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })

    const { data: profile } = await supabase.from('user_profiles').select('first_name, last_name, email').eq('id', user.id).maybeSingle()
    const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '')
    const email = parentConsentEmail({
      childName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your child',
      childEmail: profile?.email || user.email || '',
      link: `${siteUrl}/parent-consent?token=${encodeURIComponent(token)}`,
      siteUrl,
    })
    try {
      await sendEmail({ to: parentEmail, ...email })
    } catch (err) {
      console.error('Consent email failed:', err)
      return NextResponse.json({ error: err instanceof EmailNotConfiguredError ? 'Email isn\'t set up yet.' : 'Could not send the email. Please try again.' }, { status: 500 })
    }
    return NextResponse.json({ step: 'pending', parentEmail })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

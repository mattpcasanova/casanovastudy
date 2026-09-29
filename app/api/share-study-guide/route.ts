import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail, EmailNotConfiguredError } from '@/lib/email/send'
import { shareGuideEmail } from '@/lib/email/templates'

// Share a study guide by email. Signed-in users only; the guide's title and
// link are looked up server-side so the email can't be used to send arbitrary
// content or links from our address.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HOURLY_LIMIT = 20
const sentBy = new Map<string, number[]>() // per-instance, best-effort

function overLimit(userId: string): boolean {
  const hourAgo = Date.now() - 3_600_000
  const recent = (sentBy.get(userId) ?? []).filter((t) => t > hourAgo)
  sentBy.set(userId, recent)
  return recent.length >= HOURLY_LIMIT
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in to share by email.' }, { status: 401 })

  let body: { to?: string; studyGuideId?: string; message?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const to = (body.to || '').trim()
  if (!EMAIL_RE.test(to) || to.length > 254) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!body.studyGuideId) return NextResponse.json({ error: 'Missing study guide' }, { status: 400 })
  if (overLimit(user.id)) return NextResponse.json({ error: 'You’ve sent a lot of emails in the last hour. Please try again later.' }, { status: 429 })

  const supabase = createAdminClient()
  const [{ data: guide }, { data: profile }] = await Promise.all([
    supabase.from('study_guides').select('id, title, format').eq('id', body.studyGuideId).maybeSingle(),
    supabase.from('user_profiles').select('first_name, last_name, email').eq('id', user.id).maybeSingle(),
  ])
  if (!guide) return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '')
  const senderName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null
  const email = shareGuideEmail({
    senderName,
    title: guide.title,
    format: guide.format,
    url: `${siteUrl}/study-guide/${guide.id}`,
    message: typeof body.message === 'string' ? body.message.slice(0, 1000) : undefined,
    siteUrl,
  })

  try {
    await sendEmail({ to, ...email, replyTo: profile?.email || user.email || undefined })
    sentBy.get(user.id)!.push(Date.now())
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return NextResponse.json({ error: 'Email sharing isn’t set up yet. Copy the link instead for now.' }, { status: 503 })
    }
    console.error('Share email error:', err)
    return NextResponse.json({ error: 'We couldn’t send that email. Please try again, or copy the link instead.' }, { status: 502 })
  }
}

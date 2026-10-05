import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribe } from '@/lib/reminders/unsubscribe'
import { turnOffReminders } from '@/lib/reminders/run'

// Turns off email reminders from a signed link: the /reminders/off page posts
// here, and so do mail apps' one-click unsubscribe (List-Unsubscribe-Post).
// POST only, so link scanners that open emails can't switch reminders off.
export async function POST(request: NextRequest) {
  const u = request.nextUrl.searchParams.get('u') ?? ''
  const t = request.nextUrl.searchParams.get('t') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(u) || !t || !verifyUnsubscribe(u, t)) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 400 })
  }
  try {
    await turnOffReminders(u)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Unsubscribe failed', e)
    return NextResponse.json({ error: 'Could not update your settings. Please try again.' }, { status: 500 })
  }
}

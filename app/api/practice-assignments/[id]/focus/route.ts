import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { myAssignedRow } from '@/lib/practice/server'
import { sanitizeFocusEvents } from '@/lib/practice/focus'

// POST { events: [{kind, at, seconds?}] }: a student's focus-mode log while
// doing assigned practice (components/assign/focus-mode.tsx). Only recorded
// when the assignment has focus mode on and is assigned to this student.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: { events?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const events = sanitizeFocusEvents(body.events)
  if (!events.length) return NextResponse.json({ ok: true, saved: 0 })

  const supabase = createAdminClient()
  const { data: a } = await supabase.from('practice_assignments').select('id, focus_mode').eq('id', id).maybeSingle()
  if (!a?.focus_mode) return NextResponse.json({ ok: true, saved: 0 })
  const rosterId = await myAssignedRow(supabase, a.id, user.id)
  if (!rosterId) return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 })

  // A runaway page shouldn't flood the log: 500 events per student per assignment.
  const { count } = await supabase.from('assignment_focus_events').select('id', { count: 'exact', head: true }).eq('assignment_id', a.id).eq('roster_id', rosterId)
  if ((count ?? 0) >= 500) return NextResponse.json({ ok: true, saved: 0 })

  const { error } = await supabase.from('assignment_focus_events').insert(events.map((e) => ({
    assignment_id: a.id, roster_id: rosterId, student_user_id: user.id, kind: e.kind, at: e.at, seconds: e.seconds ?? null,
  })))
  if (error) {
    console.error('Focus events insert failed:', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, saved: events.length })
}

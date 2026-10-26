import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { aiUsesFor, assignmentProgress, focusEventsFor, ownedAssignment as owned, shareUrl } from '@/lib/practice/server'
import { normalizeAiHelp } from '@/lib/practice/assignments'

const origin = (request: NextRequest) => (process.env.NEXT_PUBLIC_APP_URL && !request.nextUrl.host.startsWith('localhost') ? process.env.NEXT_PUBLIC_APP_URL : request.nextUrl.origin)

// The assignment with each student's progress and AI messages (teacher).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await owned(request, id)
  if ('error' in r) return r.error
  const { supabase, assignment } = r
  const [progress, aiUses, focus, { data: guide }, { data: cls }] = await Promise.all([
    assignmentProgress(supabase, [assignment]),
    aiUsesFor(supabase, assignment.id),
    focusEventsFor(supabase, assignment.id),
    supabase.from('study_guides').select('id, title, format').eq('id', assignment.study_guide_id).maybeSingle(),
    supabase.from('classes').select('id, name, period').eq('id', assignment.class_id).maybeSingle(),
  ])
  return NextResponse.json({ assignment: { ...assignment, url: shareUrl(origin(request), assignment.code) }, students: (progress.get(assignment.id) ?? []).map((st) => ({ ...st, aiUses: aiUses.get(st.rosterId) ?? [], focus: focus.get(st.rosterId) ?? [] })), guide, class: cls }, { headers: { 'Cache-Control': 'no-store' } })
}

// PATCH { dueAt?: string|null, maxAttempts?: number|null, aiHelp?: 'off'|'tutor'|'full', focusMode?: boolean, addRosterIds?: string[], removeRosterIds?: string[] }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await owned(request, id)
  if ('error' in r) return r.error
  const { supabase, assignment } = r
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const update: Record<string, unknown> = {}
  if (body.dueAt === null) update.due_at = null
  else if (typeof body.dueAt === 'string' && !Number.isNaN(Date.parse(body.dueAt))) update.due_at = new Date(body.dueAt).toISOString()
  if ('maxAttempts' in body && assignment.grading === 'percent') {
    const max = Number(body.maxAttempts)
    update.max_attempts = body.maxAttempts === null ? null : Number.isInteger(max) && max >= 1 && max <= 20 ? max : assignment.max_attempts
  }
  if (typeof body.aiHelp === 'string') update.ai_help = normalizeAiHelp(body.aiHelp)
  if (typeof body.focusMode === 'boolean') update.focus_mode = body.focusMode
  if (Object.keys(update).length) await supabase.from('practice_assignments').update(update).eq('id', id)
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)) : [])
  const add = ids(body.addRosterIds)
  if (add.length) {
    const { data: rows } = await supabase.from('class_roster').select('id').eq('class_id', assignment.class_id).in('id', add)
    if (rows?.length) await supabase.from('practice_assignment_students').upsert(rows.map((x) => ({ assignment_id: id, roster_id: x.id })), { onConflict: 'assignment_id,roster_id', ignoreDuplicates: true })
  }
  const remove = ids(body.removeRosterIds)
  if (remove.length) await supabase.from('practice_assignment_students').delete().eq('assignment_id', id).in('roster_id', remove)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await owned(request, id)
  if ('error' in r) return r.error
  await r.supabase.from('practice_assignments').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}

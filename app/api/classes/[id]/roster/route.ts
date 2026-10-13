import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { addRosterNames, loadRoster, ownedClass, syncRosterWithEnrollments } from '@/lib/classes/server'
import { parseRosterPaste } from '@/lib/classes/roster'

// A class roster (names; students who joined with the code are linked).
// GET also links any students who joined since the last visit. Owner only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  const supabase = createAdminClient()
  const cls = await ownedClass(supabase, user.id, id)
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  await syncRosterWithEnrollments(supabase, id)
  const roster = await loadRoster(supabase, id)
  return NextResponse.json({ class: cls, roster }, { headers: { 'Cache-Control': 'no-store' } })
}

// Add names: { text } (a pasted list) or { names: [{ firstName, lastName }] }.
// Names already on the roster are skipped.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const supabase = createAdminClient()
  if (!(await ownedClass(supabase, user.id, id))) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const names = typeof body.text === 'string'
    ? parseRosterPaste(body.text.slice(0, 20000))
    : Array.isArray(body.names)
      ? (body.names as Array<{ firstName?: unknown; lastName?: unknown }>).slice(0, 200).map((n) => ({ firstName: String(n?.firstName ?? '').trim().slice(0, 60), lastName: String(n?.lastName ?? '').trim().slice(0, 60) })).filter((n) => n.firstName || n.lastName)
      : []
  if (!names.length) return NextResponse.json({ error: 'No names found' }, { status: 400 })

  const result = await addRosterNames(supabase, id, names)
  if (result.error) {
    console.error('Roster insert failed:', result.error)
    return NextResponse.json({ error: 'Could not add those names' }, { status: 500 })
  }
  return NextResponse.json({ added: result.added, skipped: result.skipped, roster: await loadRoster(supabase, id) })
}

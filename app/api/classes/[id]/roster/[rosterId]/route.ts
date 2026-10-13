import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ownedClass } from '@/lib/classes/server'

// Rename a roster name, or unlink it from a student account. Owner only.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; rosterId: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id, rosterId } = await params
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const supabase = createAdminClient()
  if (!(await ownedClass(supabase, user.id, id))) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const update: Record<string, unknown> = {}
  if (typeof body.firstName === 'string') update.first_name = body.firstName.trim().slice(0, 60)
  if (typeof body.lastName === 'string') update.last_name = body.lastName.trim().slice(0, 60)
  if (body.unlink === true) update.student_user_id = null
  if (typeof body.left === 'boolean') update.left_at = body.left ? new Date().toISOString() : null
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })

  const { error: dbError } = await supabase.from('class_roster').update(update).eq('id', rosterId).eq('class_id', id)
  if (dbError) return NextResponse.json({ error: dbError.code === '23505' ? 'That name is already on the roster' : 'Could not save' }, { status: dbError.code === '23505' ? 409 : 500 })
  // Unlinked: that account no longer sees this name's graded papers.
  if (body.unlink === true) await supabase.from('grading_results').update({ student_user_id: null }).eq('roster_id', rosterId).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; rosterId: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id, rosterId } = await params
  const supabase = createAdminClient()
  if (!(await ownedClass(supabase, user.id, id))) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  await supabase.from('class_roster').delete().eq('id', rosterId).eq('class_id', id)
  return NextResponse.json({ ok: true })
}

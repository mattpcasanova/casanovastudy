import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { loadRoster, ownedClass } from '@/lib/classes/server'
import { newCopyCode } from '@/lib/stamped/codes'

// Start a name-stamped test: one copy code per student in the chosen classes.
// The browser then stamps the blank test PDF (lib/stamped/stamp-pdf.ts).
// Body: { title, pages, classIds } -> { testId, classes: [{ id, name, period, copies: [{ code, name }] }] }
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : 'Test'
  const pages = Number(body.pages)
  if (!Number.isInteger(pages) || pages < 1 || pages > 60) return NextResponse.json({ error: 'Tests can be 1 to 60 pages' }, { status: 400 })
  const classIds = Array.isArray(body.classIds) ? body.classIds.filter((c): c is string => typeof c === 'string').slice(0, 12) : []
  if (!classIds.length) return NextResponse.json({ error: 'Pick at least one class' }, { status: 400 })

  const supabase = createAdminClient()
  const classes = []
  for (const id of classIds) {
    const cls = await ownedClass(supabase, user.id, id)
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    const roster = await loadRoster(supabase, id)
    if (!roster.length) return NextResponse.json({ error: `${cls.name} has no names on its roster yet` }, { status: 400 })
    classes.push({ cls, roster })
  }

  const { data: test, error: testError } = await supabase.from('stamped_tests').insert({ user_id: user.id, title, pages }).select('id').single()
  if (testError || !test) return NextResponse.json({ error: 'Could not start the test' }, { status: 500 })

  const out = []
  for (const { cls, roster } of classes) {
    const copies = roster.map((r) => ({
      code: newCopyCode(),
      test_id: test.id,
      user_id: user.id,
      class_id: cls.id,
      roster_id: r.id,
      student_name: `${r.firstName} ${r.lastName}`.trim(),
    }))
    const { error: copyError } = await supabase.from('stamped_copies').insert(copies)
    if (copyError) {
      console.error('Stamped copies insert failed:', copyError)
      return NextResponse.json({ error: 'Could not make the copies, try again' }, { status: 500 })
    }
    out.push({ id: cls.id, name: cls.name, period: cls.period, copies: copies.map((c) => ({ code: c.code, name: c.student_name })) })
  }
  return NextResponse.json({ testId: test.id, classes: out })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'

// Batch grader: the copy codes read from QR stamps -> who each copy belongs to.
// Only the teacher's own copies resolve. Body: { codes } -> { copies: [...] }
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let codes: string[] = []
  try {
    const body = await request.json()
    if (Array.isArray(body.codes)) codes = [...new Set((body.codes as unknown[]).filter((c): c is string => typeof c === 'string' && /^[A-Z2-9]{8}$/.test(c)))].slice(0, 2000)
  } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!codes.length) return NextResponse.json({ copies: [] })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('stamped_copies')
    .select('code, test_id, class_id, roster_id, student_name, stamped_tests(title, pages), classes(name, period)')
    .in('code', codes)
    .eq('user_id', user.id)
  const copies = (data ?? []).map((c) => {
    const test = (Array.isArray(c.stamped_tests) ? c.stamped_tests[0] : c.stamped_tests) as { title: string; pages: number } | null
    const cls = (Array.isArray(c.classes) ? c.classes[0] : c.classes) as { name: string; period: string | null } | null
    return { code: c.code, testId: c.test_id, title: test?.title ?? null, pages: test?.pages ?? 0, classId: c.class_id, className: cls?.name ?? null, classPeriod: cls?.period ?? null, rosterId: c.roster_id, name: c.student_name }
  })
  return NextResponse.json({ copies })
}

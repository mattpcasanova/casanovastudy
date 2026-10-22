import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { addRosterNames, linkRosterByEmail, ownedClass } from '@/lib/classes/server'
import { classFromCourse, listCourses, listStudents, studentToRoster } from '@/lib/google/classroom'

export const maxDuration = 120

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Import Classroom courses. Each item either goes into a class the teacher
// already has (`classId`: names are matched, so students there get their
// school email instead of a second copy) or becomes a new class with the name,
// period and subject the teacher chose. Students whose email matches an account
// are linked. The token is deleted afterwards.
// Body: { items: [{ courseId, classId?, name?, period?, subject? }] } (or the old { courseIds })
//   -> { classes: [{ id, name, period, added, skipped, filled, linked, created }] }
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let items: Array<{ courseId: string; classId: string | null; name: string; period: string; subject: string }> = []
  try {
    const body = await request.json()
    const raw: unknown[] = Array.isArray(body.items) ? body.items : Array.isArray(body.courseIds) ? body.courseIds.map((courseId: unknown) => ({ courseId })) : []
    items = raw.slice(0, 20).map((x) => {
      const i = (x ?? {}) as Record<string, unknown>
      return { courseId: str(i.courseId, 40), classId: str(i.classId, 40) || null, name: str(i.name, 100), period: str(i.period, 20), subject: str(i.subject, 60) }
    }).filter((i) => i.courseId)
  } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!items.length) return NextResponse.json({ error: 'Pick at least one course' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: tok } = await supabase.from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  if (!tok || new Date(tok.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'Connect Google Classroom again', reconnect: true }, { status: 401 })

  try {
    // Only the teacher's own courses (the list call is scoped to teacherId=me).
    const courses = new Map((await listCourses(tok.access_token)).map((c) => [c.id, c]))
    const out = []
    for (const item of items) {
      const course = courses.get(item.courseId)
      if (!course) continue
      let cls: { id: string; name: string; period: string | null } | null = null
      let created = false
      if (item.classId) {
        const owned = await ownedClass(supabase, user.id, item.classId)
        if (!owned) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
        const { data } = await supabase.from('classes').select('id, name, period, google_course_id').eq('id', item.classId).single()
        if (data && !data.google_course_id) await supabase.from('classes').update({ google_course_id: course.id }).eq('id', data.id)
        cls = data
      } else {
        const fallback = classFromCourse(course)
        const { data: code } = await supabase.rpc('generate_class_code')
        const { data: inserted, error: insertError } = await supabase
          .from('classes')
          .insert({ teacher_id: user.id, name: item.name || fallback.name, period: item.period || fallback.period, subject: item.subject || null, enrollment_code: code, google_course_id: course.id })
          .select('id, name, period')
          .single()
        if (insertError || !inserted) throw new Error(`Could not create ${item.name || fallback.name}`)
        cls = inserted
        created = true
      }
      if (!cls) continue
      const students = (await listStudents(tok.access_token, course.id)).map(studentToRoster).filter((s): s is NonNullable<typeof s> => !!s)
      const result = await addRosterNames(supabase, cls.id, students, { fuzzy: true })
      const linked = await linkRosterByEmail(supabase, cls.id)
      out.push({ id: cls.id, name: cls.name, period: cls.period, added: result.added, skipped: result.skipped, filled: result.filled, linked, created })
    }
    await supabase.from('google_classroom_tokens').delete().eq('user_id', user.id)
    return NextResponse.json({ classes: out })
  } catch (e) {
    console.error('Classroom import failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Import failed' }, { status: 502 })
  }
}

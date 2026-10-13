import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { addRosterNames, linkRosterByEmail } from '@/lib/classes/server'
import { listCourses, listStudents, periodFromSection, studentToRoster } from '@/lib/google/classroom'

export const maxDuration = 120

// Import the chosen Classroom courses as classes (or update ones imported
// before), with every student and their school email. Students whose email
// matches an account are linked right away. The token is deleted afterwards.
// Body: { courseIds } -> { classes: [{ id, name, period, added, skipped, linked, created }] }
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let courseIds: string[] = []
  try {
    const body = await request.json()
    courseIds = Array.isArray(body.courseIds) ? body.courseIds.filter((c: unknown): c is string => typeof c === 'string').slice(0, 20) : []
  } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!courseIds.length) return NextResponse.json({ error: 'Pick at least one course' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: tok } = await supabase.from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  if (!tok || new Date(tok.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'Connect Google Classroom again', reconnect: true }, { status: 401 })

  try {
    // Only the teacher's own courses (the list call is scoped to teacherId=me).
    const courses = (await listCourses(tok.access_token)).filter((c) => courseIds.includes(c.id))
    const out = []
    for (const course of courses) {
      const period = periodFromSection(course.section)
      let { data: cls } = await supabase.from('classes').select('id, name, period').eq('teacher_id', user.id).eq('google_course_id', course.id).maybeSingle()
      let created = false
      if (!cls) {
        const { data: code } = await supabase.rpc('generate_class_code')
        const { data: inserted, error: insertError } = await supabase
          .from('classes')
          .insert({ teacher_id: user.id, name: course.name.slice(0, 100), period, enrollment_code: code, google_course_id: course.id })
          .select('id, name, period')
          .single()
        if (insertError || !inserted) throw new Error(`Could not create ${course.name}`)
        cls = inserted
        created = true
      }
      const students = (await listStudents(tok.access_token, course.id)).map(studentToRoster).filter((s): s is NonNullable<typeof s> => !!s)
      const result = await addRosterNames(supabase, cls.id, students)
      const linked = await linkRosterByEmail(supabase, cls.id)
      out.push({ id: cls.id, name: cls.name, period: cls.period, added: result.added, skipped: result.skipped, linked, created })
    }
    await supabase.from('google_classroom_tokens').delete().eq('user_id', user.id)
    return NextResponse.json({ classes: out })
  } catch (e) {
    console.error('Classroom import failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Import failed' }, { status: 502 })
  }
}

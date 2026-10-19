import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { getCourse, listStudents, listSubmissions, matchClassForCourse, studentWork } from '@/lib/google/classroom'
import { schoolYearFor } from '@/lib/classes/years'

// Who uploaded what for one Classroom assignment, plus the teacher's own
// short-lived Google token: the browser opens Google's file picker with it
// (which grants this app just the picked files) and downloads the photos
// straight from Drive, since they're too big to pass through our server.
// GET ?course=&work=
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const course = request.nextUrl.searchParams.get('course') ?? ''
  const work = request.nextUrl.searchParams.get('work') ?? ''
  if (!/^[\w-]{1,40}$/.test(course) || !/^[\w-]{1,40}$/.test(work)) return NextResponse.json({ error: 'Pick an assignment' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: tok } = await supabase.from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  if (!tok || new Date(tok.expires_at).getTime() < Date.now() + 60_000) return NextResponse.json({ error: 'Connect Google Classroom again', reconnect: true }, { status: 401 })
  try {
    const [students, submissions, { data: cls }] = await Promise.all([
      listStudents(tok.access_token, course),
      listSubmissions(tok.access_token, course, work),
      supabase.from('classes').select('id').eq('teacher_id', user.id).eq('google_course_id', course).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    // A class made from a gradebook file isn't tied to the course yet: find it
    // by period (and name), and remember the link so scores can go back too.
    let classId: string | null = cls?.id ?? null
    if (!classId) {
      const [gc, { data: mine }] = await Promise.all([
        getCourse(tok.access_token, course),
        supabase.from('classes').select('id, name, period, course').eq('teacher_id', user.id).eq('school_year', schoolYearFor()).eq('is_archived', false).is('google_course_id', null),
      ])
      classId = gc ? matchClassForCourse({ name: gc.name, section: gc.section }, mine ?? []) : null
      if (classId) await supabase.from('classes').update({ google_course_id: course }).eq('id', classId).eq('teacher_id', user.id).is('google_course_id', null)
    }
    return NextResponse.json({
      students: studentWork(submissions, students),
      classId,
      accessToken: tok.access_token,
      expiresAt: tok.expires_at,
    })
  } catch (e) {
    console.error('Classroom submissions failed:', e)
    return NextResponse.json({ error: 'Google Classroom did not answer. Try connecting again.', reconnect: true }, { status: 502 })
  }
}

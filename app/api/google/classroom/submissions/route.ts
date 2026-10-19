import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { listStudents, listSubmissions, studentWork } from '@/lib/google/classroom'

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
    return NextResponse.json({
      students: studentWork(submissions, students),
      classId: cls?.id ?? null,
      accessToken: tok.access_token,
      expiresAt: tok.expires_at,
    })
  } catch (e) {
    console.error('Classroom submissions failed:', e)
    return NextResponse.json({ error: 'Google Classroom did not answer. Try connecting again.', reconnect: true }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ClassroomError, createCourseWork, listStudents, listSubmissions, setGrade } from '@/lib/google/classroom'

export const maxDuration = 120

// Send a graded set's scores to Google Classroom. Classroom only lets an app
// grade assignments it created, so the first send creates a "<exam title>"
// assignment in the course (remembered in grade_syncs; later sends update it).
// Students are matched by school email from the roster. Owner only.
// GET ?batchId= -> { synced: { at } | null }   POST { batchId } -> { sent, notFound, assignment }
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const batchId = request.nextUrl.searchParams.get('batchId') ?? ''
  const { data } = await createAdminClient().from('grade_syncs').select('synced_at').eq('batch_id', batchId).eq('target', 'google_classroom').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ synced: data ? { at: data.synced_at } : null })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let batchId = ''
  try { batchId = String((await request.json()).batchId ?? '') } catch { /* below */ }
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) return NextResponse.json({ error: 'Missing class set' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: tok } = await supabase.from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  if (!tok || new Date(tok.expires_at).getTime() < Date.now() + 60_000) return NextResponse.json({ error: 'Connect Google Classroom first', reconnect: true }, { status: 401 })

  const { data: papers } = await supabase
    .from('grading_results')
    .select('id, exam_title, class_id, roster_id, student_name, total_marks, total_possible_marks')
    .eq('batch_id', batchId).eq('user_id', user.id)
  if (!papers?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const classId = papers.find((p) => p.class_id)?.class_id
  const { data: cls } = classId ? await supabase.from('classes').select('google_course_id').eq('id', classId).eq('teacher_id', user.id).maybeSingle() : { data: null }
  const courseId = cls?.google_course_id as string | undefined
  if (!courseId) return NextResponse.json({ error: 'This class wasn\'t imported from Google Classroom' }, { status: 400 })

  const { data: roster } = await supabase.from('class_roster').select('id, email').eq('class_id', classId!)
  const emailOf = new Map((roster ?? []).map((r) => [r.id as string, (r.email as string | null)?.toLowerCase() ?? null]))
  const possible = Math.max(...papers.map((p) => Number(p.total_possible_marks) || 0), 1)
  const title = papers[0].exam_title || 'Graded test'

  try {
    const { data: prior } = await supabase.from('grade_syncs').select('external_id, external_course_id').eq('batch_id', batchId).eq('target', 'google_classroom').eq('user_id', user.id).maybeSingle()
    let courseWorkId = prior && prior.external_course_id === courseId ? prior.external_id : null
    if (!courseWorkId) courseWorkId = await createCourseWork(tok.access_token, courseId, title, possible)

    const [students, submissions] = await Promise.all([listStudents(tok.access_token, courseId), listSubmissions(tok.access_token, courseId, courseWorkId)])
    const userIdByEmail = new Map(students.filter((s) => s.userId && s.profile?.emailAddress).map((s) => [s.profile!.emailAddress!.toLowerCase(), s.userId!]))
    const submissionByUser = new Map(submissions.map((s) => [s.userId, s.id]))

    let sent = 0
    const notFound: string[] = []
    for (const p of papers) {
      const email = p.roster_id ? emailOf.get(p.roster_id) : null
      const submission = email ? submissionByUser.get(userIdByEmail.get(email) ?? '') : undefined
      if (!submission) { notFound.push(p.student_name ?? 'Student'); continue }
      await setGrade(tok.access_token, courseId, courseWorkId, submission, Number(p.total_marks))
      sent++
    }
    await supabase.from('grade_syncs').upsert({ batch_id: batchId, target: 'google_classroom', user_id: user.id, external_course_id: courseId, external_id: courseWorkId, synced_at: new Date().toISOString() })
    return NextResponse.json({ sent, notFound, assignment: title })
  } catch (e) {
    if (e instanceof ClassroomError && (e.status === 401 || e.status === 403)) {
      return NextResponse.json({ error: 'Google Classroom needs permission to post grades. Connect again and allow it.', reconnect: true }, { status: 401 })
    }
    console.error('Classroom grade send failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not send the scores' }, { status: 502 })
  }
}

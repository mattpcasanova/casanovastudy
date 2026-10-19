import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ClassroomError, classroomConfigured, classroomDue, createLinkCourseWork, listStudents, listSubmissions, matchClassroomStudents, setGrade } from '@/lib/google/classroom'
import { ASSIGNMENT_COLUMNS, assignmentProgress, shareUrl, type AssignmentRow } from '@/lib/practice/server'

export const maxDuration = 120

const origin = (request: NextRequest) => (process.env.NEXT_PUBLIC_APP_URL && !request.nextUrl.host.startsWith('localhost') ? process.env.NEXT_PUBLIC_APP_URL : request.nextUrl.origin)

// Assigned practice and Google Classroom (owner only).
// GET -> { configured, connected, courseId, posted: { link, syncedAt } | null }
// POST { action: 'post', courseId? } -> creates a Classroom assignment for just
//   the assigned students (matched by school email, then name) with the link.
//   Classroom lets this app grade it later, because the app created it.
// POST { action: 'grades' } -> each student's best score (out of 100) as their
//   draft and assigned grade.
async function setup(request: NextRequest, id: string) {
  const { user, error } = await requireTeacher(request)
  if (error) return { error }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const supabase = createAdminClient()
  const { data } = await supabase.from('practice_assignments').select(`${ASSIGNMENT_COLUMNS}, classroom_course_id, classroom_work_id, classroom_link, classroom_synced_at`).eq('id', id).eq('teacher_id', user.id).maybeSingle()
  if (!data) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const { data: cls } = await supabase.from('classes').select('id, google_course_id').eq('id', data.class_id).maybeSingle()
  const { data: tok } = await supabase.from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  const token = tok && new Date(tok.expires_at).getTime() > Date.now() + 60_000 ? (tok.access_token as string) : null
  return { supabase, assignment: data as AssignmentRow & { classroom_course_id: string | null; classroom_work_id: string | null; classroom_link: string | null; classroom_synced_at: string | null }, cls, token }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await setup(request, id)
  if ('error' in r) return r.error
  const a = r.assignment
  return NextResponse.json({
    configured: classroomConfigured(),
    connected: !!r.token,
    courseId: a.classroom_course_id ?? r.cls?.google_course_id ?? null,
    posted: a.classroom_work_id ? { link: a.classroom_link, syncedAt: a.classroom_synced_at } : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await setup(request, id)
  if ('error' in r) return r.error
  const { supabase, assignment: a, cls, token } = r
  if (!token) return NextResponse.json({ error: 'Connect Google Classroom first', reconnect: true }, { status: 401 })
  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* empty */ }

  // The assigned roster names.
  const { data: who } = await supabase.from('practice_assignment_students').select('roster_id, class_roster(id, first_name, last_name, email)').eq('assignment_id', a.id)
  const roster = (who ?? []).map((w) => (Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { id: string; first_name: string; last_name: string; email: string | null })
    .filter(Boolean).map((x) => ({ id: x.id, firstName: x.first_name, lastName: x.last_name, email: x.email }))

  try {
    if (body.action === 'post') {
      if (a.classroom_work_id) return NextResponse.json({ error: 'Already posted to Classroom' }, { status: 409 })
      const picked = typeof body.courseId === 'string' && /^[\w-]{1,40}$/.test(body.courseId) ? body.courseId : null
      const courseId = cls?.google_course_id ?? picked
      if (!courseId) return NextResponse.json({ error: 'Pick the Classroom course for this class' }, { status: 400 })
      // Remember which course this class is, for next time (and for sending test scores).
      if (!cls?.google_course_id && cls) await supabase.from('classes').update({ google_course_id: courseId }).eq('id', cls.id).is('google_course_id', null)

      const match = matchClassroomStudents(roster, await listStudents(token, courseId))
      if (!match.userIdByRoster.size) return NextResponse.json({ error: 'None of these students were found in that Classroom course. Check it\'s the right course.', unmatched: match.unmatched }, { status: 400 })
      for (const f of match.emailFill) await supabase.from('class_roster').update({ email: f.email }).eq('id', f.rosterId).is('email', null)

      const work = await createLinkCourseWork(token, courseId, {
        title: a.title,
        description: 'Open the link, sign in with your school Google account, and do the practice. Your best score is sent here when your teacher sends grades.',
        url: shareUrl(origin(request), a.code),
        studentIds: [...match.userIdByRoster.values()],
        due: classroomDue(a.due_at),
      })
      await supabase.from('practice_assignments').update({ classroom_course_id: courseId, classroom_work_id: work.id, classroom_link: work.alternateLink }).eq('id', a.id)
      return NextResponse.json({ posted: match.userIdByRoster.size, unmatched: match.unmatched, link: work.alternateLink })
    }

    if (body.action === 'grades') {
      if (!a.classroom_course_id || !a.classroom_work_id) return NextResponse.json({ error: 'Post it to Classroom first' }, { status: 400 })
      const [students, submissions, progress] = await Promise.all([
        listStudents(token, a.classroom_course_id),
        listSubmissions(token, a.classroom_course_id, a.classroom_work_id),
        assignmentProgress(supabase, [a]),
      ])
      const match = matchClassroomStudents(roster, students)
      const submissionOf = new Map(submissions.map((s) => [s.userId, s.id]))
      let sent = 0
      const notFound: string[] = []
      for (const st of progress.get(a.id) ?? []) {
        if (!st.best) continue
        const sub = submissionOf.get(match.userIdByRoster.get(st.rosterId) ?? '')
        if (!sub) { notFound.push(st.name); continue }
        await setGrade(token, a.classroom_course_id, a.classroom_work_id, sub, Math.round(st.best.pct * 10) / 10)
        sent++
      }
      await supabase.from('practice_assignments').update({ classroom_synced_at: new Date().toISOString() }).eq('id', a.id)
      return NextResponse.json({ sent, notFound })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('Practice Classroom failed:', e)
    if (e instanceof ClassroomError && (e.status === 401 || e.status === 403)) return NextResponse.json({ error: 'Google Classroom said no. Connect again and allow every permission.', reconnect: true }, { status: 403 })
    return NextResponse.json({ error: 'Google Classroom did not answer. Try again in a minute.' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { listCourseWork, uploadAssignments } from '@/lib/google/classroom'

// A course's assignments students upload work to (for grading their uploads).
// GET ?course=<Classroom course id>
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const course = request.nextUrl.searchParams.get('course') ?? ''
  if (!/^[\w-]{1,40}$/.test(course)) return NextResponse.json({ error: 'Pick a course' }, { status: 400 })
  const { data: tok } = await createAdminClient().from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  if (!tok || new Date(tok.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'Connect Google Classroom again', reconnect: true }, { status: 401 })
  try {
    return NextResponse.json({ assignments: uploadAssignments(await listCourseWork(tok.access_token, course)) })
  } catch (e) {
    console.error('Classroom coursework failed:', e)
    return NextResponse.json({ error: 'Google Classroom did not answer. Try connecting again.', reconnect: true }, { status: 502 })
  }
}

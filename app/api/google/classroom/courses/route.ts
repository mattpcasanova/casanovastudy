import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { listCourses, periodFromSection } from '@/lib/google/classroom'

// The teacher's active Classroom courses, and which are already imported.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const supabase = createAdminClient()
  const { data: tok } = await supabase.from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  if (!tok || new Date(tok.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'Connect Google Classroom again', reconnect: true }, { status: 401 })
  try {
    const [courses, { data: imported }] = await Promise.all([
      listCourses(tok.access_token),
      supabase.from('classes').select('id, google_course_id').eq('teacher_id', user.id).not('google_course_id', 'is', null),
    ])
    const classOf = new Map((imported ?? []).map((c) => [c.google_course_id as string, c.id as string]))
    return NextResponse.json({
      courses: courses.map((c) => ({ id: c.id, name: c.name, section: c.section ?? null, period: periodFromSection(c.section), importedClassId: classOf.get(c.id) ?? null })),
    })
  } catch (e) {
    console.error('Classroom courses failed:', e)
    return NextResponse.json({ error: 'Google Classroom did not answer. Try connecting again.', reconnect: true }, { status: 502 })
  }
}

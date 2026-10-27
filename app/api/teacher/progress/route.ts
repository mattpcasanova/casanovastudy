import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { loadTeacherProgress } from '@/lib/teacher/progress-server'

// How the teacher's classes are doing this year, by course (/teacher/progress).
// ?year=2025-26 for a past year; ?course=<key> for one course.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const q = request.nextUrl.searchParams
  const data = await loadTeacherProgress(createAdminClient(), user.id, { year: q.get('year'), course: q.get('course') })
  if (q.get('course') && !data.courses.length) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

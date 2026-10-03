import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'

// A batch's results (the class results page). Owner only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error: dbError } = await createAdminClient()
    .from('grading_results')
    .select('id, student_name, total_marks, total_possible_marks, percentage, grade, exam_title, class_name, class_period, created_at')
    .eq('batch_id', id)
    .eq('user_id', user.id)
    .order('student_name', { ascending: true })
  if (dbError) return NextResponse.json({ error: 'Could not load results' }, { status: 500 })
  return NextResponse.json({ results: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

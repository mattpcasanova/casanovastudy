import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'

// Has the teacher already graded some of this Google Classroom assignment?
// The set it came from (saved with grading_batches), or else a recent set with
// the same title. GET ?work=&title= -> { set: { batchId, title, date, classId, names } | null }
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const q = request.nextUrl.searchParams
  const work = q.get('work') ?? ''
  const title = (q.get('title') ?? '').trim().slice(0, 200)
  const supabase = createAdminClient()

  let batchId: string | null = null
  if (/^[\w-]{1,40}$/.test(work)) {
    const { data } = await supabase.from('grading_batches').select('batch_id, updated_at').eq('user_id', user.id).eq('classroom_work_id', work).order('updated_at', { ascending: false }).limit(1).maybeSingle()
    batchId = data?.batch_id ?? null
  }
  if (!batchId && title) {
    const since = new Date(Date.now() - 120 * 86400000).toISOString()
    const { data } = await supabase.from('grading_results').select('batch_id').eq('user_id', user.id).ilike('exam_title', title.replace(/[%_]/g, '\\$&')).not('batch_id', 'is', null).gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle()
    batchId = data?.batch_id ?? null
  }
  if (!batchId) return NextResponse.json({ set: null })
  const { data: rows } = await supabase.from('grading_results').select('student_name, exam_title, created_at, class_id').eq('batch_id', batchId).eq('user_id', user.id).order('created_at')
  if (!rows?.length) return NextResponse.json({ set: null })
  return NextResponse.json({
    set: { batchId, title: rows[0].exam_title, date: rows[0].created_at, classId: rows.find((r) => r.class_id)?.class_id ?? null, names: rows.map((r) => r.student_name).filter(Boolean) },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ownedClass } from '@/lib/classes/server'

// Share with a class (migration 075): a teacher's guide, any format, given to
// a class with no grading. GET ?guideId= | ?classId= lists shares; POST
// { classId, studyGuideId, note? } shares (once per class); DELETE { id } unshares.
const UUID = /^[0-9a-f-]{36}$/i

export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const q = request.nextUrl.searchParams
  const guideId = q.get('guideId'), classId = q.get('classId')
  const supabase = createAdminClient()
  let query = supabase.from('class_shared_guides').select('id, class_id, study_guide_id, note, created_at, classes(name, period), study_guides(title, format)').eq('teacher_id', user.id).order('created_at', { ascending: false }).limit(200)
  if (guideId && UUID.test(guideId)) query = query.eq('study_guide_id', guideId)
  if (classId && UUID.test(classId)) query = query.eq('class_id', classId)
  const { data } = await query
  const one = <T,>(v: unknown): T | null => ((Array.isArray(v) ? v[0] : v) as T | null) ?? null
  return NextResponse.json({
    shares: (data ?? []).map((r) => {
      const c = one<{ name: string; period: string | null }>(r.classes)
      const g = one<{ title: string; format: string }>(r.study_guides)
      return { id: r.id, classId: r.class_id, guideId: r.study_guide_id, note: r.note, createdAt: r.created_at, className: c?.name ?? '', period: c?.period ?? null, title: g?.title ?? '', format: g?.format ?? '' }
    }),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const body = await request.json().catch(() => ({})) as { classId?: string; studyGuideId?: string; note?: string }
  if (!body.classId || !UUID.test(body.classId) || !body.studyGuideId || !UUID.test(body.studyGuideId)) return NextResponse.json({ error: 'Pick a class and a guide' }, { status: 400 })
  const supabase = createAdminClient()
  if (!(await ownedClass(supabase, user.id, body.classId))) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  const { data: guide } = await supabase.from('study_guides').select('id, user_id').eq('id', body.studyGuideId).maybeSingle()
  if (!guide || guide.user_id !== user.id) return NextResponse.json({ error: 'Save the guide to My Guides first, then share your copy' }, { status: 403 })
  const note = (body.note ?? '').trim().slice(0, 300) || null
  const { data, error: insertError } = await supabase
    .from('class_shared_guides')
    .upsert({ class_id: body.classId, study_guide_id: body.studyGuideId, teacher_id: user.id, note }, { onConflict: 'class_id,study_guide_id' })
    .select('id')
    .single()
  if (insertError || !data) return NextResponse.json({ error: 'Could not share it' }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const body = await request.json().catch(() => ({})) as { id?: string }
  if (!body.id || !UUID.test(body.id)) return NextResponse.json({ error: 'Which share?' }, { status: 400 })
  await createAdminClient().from('class_shared_guides').delete().eq('id', body.id).eq('teacher_id', user.id)
  return NextResponse.json({ ok: true })
}

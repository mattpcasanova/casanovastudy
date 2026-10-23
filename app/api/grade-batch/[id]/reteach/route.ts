import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase-server'
import type { ClassInsightsAI } from '@/lib/grading/insights'
import type { GradedQuestion } from '@/lib/grading/parse'
import { parseReteachPlan, reteachEvidence, reteachGroups, reteachTopicOptions, type ReteachPaper } from '@/lib/grading/reteach'

export const maxDuration = 120

// Reteach plan for a graded set: GET the saved one, POST to write it (or a
// new one) from the class report's topics and the marks. Groups (with names)
// are worked out here; the AI only sees group sizes. Owner only.

async function load(userId: string, batchId: string) {
  const supabase = createAdminClient()
  const [{ data: rows }, { data: report }] = await Promise.all([
    supabase.from('grading_results').select('id, student_name, roster_id, grade_breakdown, exam_title, class_name, class_id').eq('batch_id', batchId).eq('user_id', userId).order('student_name'),
    supabase.from('grading_batch_insights').select('data').eq('batch_id', batchId).eq('user_id', userId).maybeSingle(),
  ])
  return { rows: rows ?? [], insights: (report?.data ?? null) as ClassInsightsAI | null }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data } = await createAdminClient().from('reteach_plans').select('data, created_at').eq('batch_id', id).eq('user_id', user.id).maybeSingle()
  const { rows, insights } = await load(user.id, id)
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Topic scores, with the ones we'd focus on (weakest under 80%, up to 3) marked.
  const papers: ReteachPaper[] = rows.map((r) => ({ id: r.id, name: '', rosterId: null, breakdown: (Array.isArray(r.grade_breakdown) ? r.grade_breakdown : []) as GradedQuestion[] }))
  return NextResponse.json({
    saved: data ? { ...data.data, createdAt: data.created_at } : null,
    topics: reteachTopicOptions(papers, insights?.topics ?? []),
    examTitle: rows[0].exam_title,
    className: rows[0].class_name,
    classId: rows.find((r) => r.class_id)?.class_id ?? null,
    ready: !!insights?.topics?.length,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* defaults */ }
  const minutes = [30, 40, 45, 50, 55, 60, 75, 90].includes(Number(body.minutes)) ? Number(body.minutes) : 50
  const focusNames = Array.isArray(body.focus) ? body.focus.filter((f): f is string => typeof f === 'string').slice(0, 3) : undefined
  const detail = body.detail === 'quick' || body.detail === 'detailed' ? body.detail : 'standard'

  const { rows, insights } = await load(user.id, id)
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!insights?.topics?.length) return NextResponse.json({ error: 'The class report for this set isn\'t written yet. Open the class results page first.' }, { status: 409 })

  const papers: ReteachPaper[] = rows.map((r) => ({ id: r.id, name: r.student_name ?? 'Student', rosterId: r.roster_id, breakdown: (Array.isArray(r.grade_breakdown) ? r.grade_breakdown : []) as GradedQuestion[] }))
  const { focus, groups } = reteachGroups(papers, insights.topics, focusNames)

  try {
    const { text } = await new ClaudeService().reteachPlan(reteachEvidence(papers, insights, focus, groups), { examTitle: rows[0].exam_title, className: rows[0].class_name, minutes, detail })
    const plan = parseReteachPlan(text)
    if (!plan) throw new Error('The plan came back in a form we could not read. Try again.')
    const data = { plan, minutes, detail, focus: focus.map((t) => ({ name: t.name, pct: Math.round(t.pct) })), groups, examTitle: rows[0].exam_title, className: rows[0].class_name }
    const createdAt = new Date().toISOString()
    await createAdminClient().from('reteach_plans').upsert({ batch_id: id, user_id: user.id, data, created_at: createdAt })
    return NextResponse.json({ saved: { ...data, createdAt } })
  } catch (e) {
    console.error('Reteach plan failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not write the plan' }, { status: 500 })
  }
}

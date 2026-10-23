import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import type { ClassInsightsAI } from '@/lib/grading/insights'
import { parseReteachPlan, reteachEvidence, reteachGroups, reteachTopicOptions } from '@/lib/grading/reteach'
import { ownedAssignment } from '@/lib/practice/server'
import { loadPracticeReport } from '@/lib/practice/report-server'

export const maxDuration = 120

// Reteach plan for assigned practice, same as a graded set's
// (/api/grade-batch/[id]/reteach): GET the saved plan and topic choices, POST
// to write one from the class report's topics and the students' answers.
// Groups (with names) are worked out here; the AI only sees group sizes.

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await ownedAssignment(request, id)
  if ('error' in r) return r.error
  const [report, { data: saved }] = await Promise.all([
    loadPracticeReport(r.supabase, r.assignment),
    r.supabase.from('practice_reports').select('insights, reteach, reteach_at').eq('assignment_id', id).maybeSingle(),
  ])
  const insights = (saved?.insights ?? null) as ClassInsightsAI | null
  return NextResponse.json({
    saved: saved?.reteach ? { ...saved.reteach, createdAt: saved.reteach_at } : null,
    topics: reteachTopicOptions(report.papers, insights?.topics ?? []),
    examTitle: r.assignment.title,
    className: report.className,
    classId: r.assignment.class_id,
    ready: !!insights?.topics?.length,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await ownedAssignment(request, id)
  if ('error' in r) return r.error
  const block = await gradingBlock(r.userId)
  if (block) return planBlockResponse(block)
  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* defaults */ }
  const minutes = [30, 40, 45, 50, 55, 60, 75, 90].includes(Number(body.minutes)) ? Number(body.minutes) : 50
  const focusNames = Array.isArray(body.focus) ? body.focus.filter((f): f is string => typeof f === 'string').slice(0, 3) : undefined
  const detail = body.detail === 'quick' || body.detail === 'detailed' ? body.detail : 'standard'

  const [report, { data: saved }] = await Promise.all([
    loadPracticeReport(r.supabase, r.assignment),
    r.supabase.from('practice_reports').select('insights').eq('assignment_id', id).maybeSingle(),
  ])
  const insights = (saved?.insights ?? null) as ClassInsightsAI | null
  if (!insights?.topics?.length) return NextResponse.json({ error: 'The class report for this practice isn\'t written yet. Open the assignment page first.' }, { status: 409 })
  if (!report.papers.length) return NextResponse.json({ error: 'No one has finished it yet' }, { status: 400 })

  const { focus, groups } = reteachGroups(report.papers, insights.topics, focusNames)
  try {
    const { text } = await new ClaudeService().reteachPlan(reteachEvidence(report.papers, insights, focus, groups, { questionText: report.questionText }), { examTitle: r.assignment.title, className: report.className, minutes, detail, source: 'practice' })
    const plan = parseReteachPlan(text)
    if (!plan) throw new Error('The plan came back in a form we could not read. Try again.')
    const data = { plan, minutes, detail, focus: focus.map((t) => ({ name: t.name, pct: Math.round(t.pct) })), groups, examTitle: r.assignment.title, className: report.className, source: 'practice' as const }
    const createdAt = new Date().toISOString()
    await r.supabase.from('practice_reports').upsert({ assignment_id: id, user_id: r.userId, reteach: data, reteach_at: createdAt })
    return NextResponse.json({ saved: { ...data, createdAt } })
  } catch (e) {
    console.error('Practice reteach plan failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not write the plan' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase-server'
import { questionStats, type ClassInsightsAI } from '@/lib/grading/insights'
import { normalizeQuestionKey, type GradedQuestion } from '@/lib/grading/parse'
import { groupsForPrompt, parseReteachPlan, reteachGroups, topicScores, type ReteachPaper } from '@/lib/grading/reteach'

export const maxDuration = 120

// Reteach plan for a graded set: GET the saved one, POST to write it (or a
// new one) from the class report's topics and the marks. Groups (with names)
// are worked out here; the AI only sees group sizes. Owner only.

async function load(userId: string, batchId: string) {
  const supabase = createAdminClient()
  const [{ data: rows }, { data: report }] = await Promise.all([
    supabase.from('grading_results').select('id, student_name, roster_id, grade_breakdown, exam_title, class_name').eq('batch_id', batchId).eq('user_id', userId).order('student_name'),
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
  const scored = insights?.topics?.length ? topicScores(papers, insights.topics) : []
  const recommended = new Set(insights?.topics?.length ? reteachGroups(papers, insights.topics).focus.map((t) => t.name) : [])
  return NextResponse.json({
    saved: data ? { ...data.data, createdAt: data.created_at } : null,
    topics: scored.map((t) => ({ name: t.name, pct: Math.round(t.pct), recommended: recommended.has(t.name) })),
    examTitle: rows[0].exam_title,
    className: rows[0].class_name,
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

  // Evidence for the AI: focus topics, the questions behind them, what students wrote wrong (no names).
  const focusKeys = new Set(focus.flatMap((t) => t.questions.map(normalizeQuestionKey)))
  const stats = questionStats(papers.map((p) => ({ id: p.id, name: '', breakdown: p.breakdown }))).filter((s) => focusKeys.has(s.key))
  const evidence: string[] = []
  evidence.push(`FOCUS TOPICS (class percent):\n${focus.map((t) => `- ${t.name}: ${Math.round(t.pct)}% (questions ${t.questions.join(', ')})`).join('\n')}`)
  evidence.push(`QUESTIONS:\n${stats.map((s) => `- ${s.label}: class average ${Math.round(s.avgPct)}% of ${s.possible} marks, ${s.zeroCount} of ${s.n} scored 0`).join('\n')}`)
  const snippets: string[] = []
  for (const s of stats) {
    const lost = papers
      .map((p) => p.breakdown.find((q) => normalizeQuestionKey(q.questionNumber) === s.key))
      .filter((q): q is GradedQuestion => !!q && q.marksAwarded < q.marksPossible && !!q.explanation)
    lost.slice(0, 4).forEach((q) => snippets.push(`- Q${s.label} (${q.marksAwarded}/${q.marksPossible}): ${q.explanation.slice(0, 240)}`))
  }
  if (snippets.length) evidence.push(`MARKING FEEDBACK FROM STUDENTS WHO LOST MARKS:\n${snippets.join('\n')}`)
  const struggles = (insights.struggles ?? []).filter((x) => focusKeys.has(normalizeQuestionKey(x.question)))
  if (struggles.length) evidence.push(`COMMON MISTAKES (class report):\n${struggles.map((x) => `- Q${x.question}: ${x.issue}`).join('\n')}`)
  if (insights.reteach?.length) evidence.push(`CLASS REPORT SUGGESTIONS:\n${insights.reteach.map((r) => `- ${r}`).join('\n')}`)
  evidence.push(`GROUPS FOR THE GROUP-WORK PART:\n${groupsForPrompt(groups)}`)

  try {
    const { text } = await new ClaudeService().reteachPlan(evidence.join('\n\n'), { examTitle: rows[0].exam_title, className: rows[0].class_name, minutes, detail })
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

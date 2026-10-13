import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase-server'
import { insightsInput, insightsSignature, parseClassInsights, questionStats, type ClassInsightsAI, type PaperForInsights } from '@/lib/grading/insights'
import { knownAreaNames } from '@/lib/classes/areas'

// Class report, AI part: topic grouping, common mistakes and what to reteach.
// The numbers come from lib/grading/insights.ts on the page; this only writes
// the words, saves them (grading_batch_insights) and reuses them until a mark
// changes (signature). Owner only.

export const maxDuration = 120

/** Topic names the class's other graded sets already use (lib/classes/areas.ts). */
async function classAreaNames(supabase: ReturnType<typeof createAdminClient>, userId: string, classId: string | null, batchId: string): Promise<string[]> {
  if (!classId) return []
  const { data: rows } = await supabase.from('grading_results').select('batch_id').eq('class_id', classId).eq('user_id', userId).not('batch_id', 'is', null).neq('batch_id', batchId).limit(2000)
  const batchIds = [...new Set((rows ?? []).map((r) => r.batch_id as string))]
  if (!batchIds.length) return []
  const { data: saved } = await supabase.from('grading_batch_insights').select('data').in('batch_id', batchIds).eq('user_id', userId)
  return knownAreaNames((saved ?? []).map((s) => (s.data as ClassInsightsAI)?.topics ?? []))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createAdminClient()
  const { data: rows, error: dbError } = await supabase
    .from('grading_results')
    .select('id, student_name, grade_breakdown, exam_title, class_name, class_id')
    .eq('batch_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (dbError) return NextResponse.json({ error: 'Could not load results' }, { status: 500 })
  if (!rows?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const papers: PaperForInsights[] = rows.map((r) => ({ id: r.id, name: r.student_name ?? '', breakdown: Array.isArray(r.grade_breakdown) ? r.grade_breakdown : [] }))
  const signature = insightsSignature(papers)

  // Reuse the saved report unless the marks changed.
  const { data: saved } = await supabase.from('grading_batch_insights').select('signature, data, created_at').eq('batch_id', id).eq('user_id', user.id).maybeSingle()
  if (saved && saved.signature === signature) return NextResponse.json({ insights: saved.data, current: true, createdAt: saved.created_at })

  const stats = questionStats(papers)
  if (!stats.length) return NextResponse.json({ error: 'These papers have no per-question marks to report on' }, { status: 400 })

  try {
    const knownAreas = await classAreaNames(supabase, user.id, rows.find((r) => r.class_id)?.class_id ?? null, id)
    const { text } = await new ClaudeService().classInsights(insightsInput(papers, stats), { examTitle: rows[0].exam_title, className: rows[0].class_name, knownAreas })
    const insights = parseClassInsights(text)
    if (!insights) throw new Error('The report came back in a form we could not read. Try again.')
    const createdAt = new Date().toISOString()
    await supabase.from('grading_batch_insights').upsert({ batch_id: id, user_id: user.id, signature, data: insights, created_at: createdAt })
    return NextResponse.json({ insights, current: true, createdAt })
  } catch (e) {
    console.error('Class insights failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not write the class report' }, { status: 500 })
  }
}

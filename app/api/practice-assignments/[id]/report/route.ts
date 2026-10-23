import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { parseClassInsights, type ClassInsightsAI } from '@/lib/grading/insights'
import { ownedAssignment } from '@/lib/practice/server'
import { loadPracticeReport } from '@/lib/practice/report-server'
import { practiceInsightsInput } from '@/lib/practice/report'

export const maxDuration = 120

// Class report for assigned practice (owner only): GET the per-question
// results (from each student's counted attempt) and the saved AI summary;
// POST writes the summary (or reuses it until the answers change). Topics
// come from the guide itself when it has them; the AI only writes words.

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await ownedAssignment(request, id)
  if ('error' in r) return r.error
  const report = await loadPracticeReport(r.supabase, r.assignment)
  const { data: saved } = await r.supabase.from('practice_reports').select('signature, insights, insights_at').eq('assignment_id', id).maybeSingle()
  return NextResponse.json({
    format: report.guide?.format ?? null,
    assigned: report.assigned,
    finished: report.runs.length,
    results: report.results,
    papers: report.papers,
    topics: report.topics,
    insights: saved?.insights ? { insights: saved.insights, current: saved.signature === report.signature, createdAt: saved.insights_at } : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await ownedAssignment(request, id)
  if ('error' in r) return r.error
  const block = await gradingBlock(r.userId)
  if (block) return planBlockResponse(block)
  const report = await loadPracticeReport(r.supabase, r.assignment)
  if (!report.results.length) return NextResponse.json({ error: 'No one has finished it yet' }, { status: 400 })

  const { data: saved } = await r.supabase.from('practice_reports').select('signature, insights, insights_at').eq('assignment_id', id).maybeSingle()
  if (saved?.insights && saved.signature === report.signature) return NextResponse.json({ insights: saved.insights, current: true, createdAt: saved.insights_at })

  try {
    const { text } = await new ClaudeService().classInsights(practiceInsightsInput(report.results, report.runs.length), {
      examTitle: r.assignment.title,
      className: report.className,
      knownAreas: report.topics.map((t) => t.name),
      source: 'practice',
    })
    const parsed = parseClassInsights(text)
    if (!parsed) throw new Error('The report came back in a form we could not read. Try again.')
    // The guide's own topics (quiz sections, adaptive concepts) beat the AI's grouping.
    const insights: ClassInsightsAI = report.topics.length ? { ...parsed, topics: report.topics } : parsed
    const createdAt = new Date().toISOString()
    await r.supabase.from('practice_reports').upsert({ assignment_id: id, user_id: r.userId, signature: report.signature, insights, insights_at: createdAt })
    return NextResponse.json({ insights, current: true, createdAt })
  } catch (e) {
    console.error('Practice class report failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not write the class report' }, { status: 500 })
  }
}

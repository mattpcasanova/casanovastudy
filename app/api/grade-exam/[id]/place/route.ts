import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'
import { pickUploadRefs } from '@/lib/uploads/refs'
import { locateAnswers } from '@/lib/grading/locate-server'
import { placeAtPositions } from '@/lib/grading/locate'
import type { GradedQuestion } from '@/lib/grading/parse'

// "Put the marks on the paper": the model finds where each answer sits on the
// saved pages and every marked question's marks are stamped in the right
// margin at that height (marks the teacher already placed stay). Owner only;
// returns the new breakdown. About a cent a paper.
export const maxDuration = 120

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)

  const supabase = createAdminClient()
  const { data: row } = await supabase.from('grading_results').select('id, grade_breakdown, page_urls').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const refs = pickUploadRefs(row.page_urls, 40)
  if (!refs.length) return NextResponse.json({ error: 'This report has no saved pages.' }, { status: 409 })
  const breakdown = (Array.isArray(row.grade_breakdown) ? row.grade_breakdown : []) as GradedQuestion[]
  const marked = breakdown.filter((q) => !q.unmarked)
  if (!marked.length) return NextResponse.json({ error: 'Mark the questions first; then the marks can go on the paper.' }, { status: 400 })

  try {
    const pages = await fetchUploadedImageBuffers(refs, 40, user.id)
    const { positions } = await locateAnswers(pages, marked.map((q) => q.questionNumber))
    const result = placeAtPositions(breakdown, positions)
    if (result.placed) {
      await supabase.from('grading_results').update({ grade_breakdown: result.breakdown, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    }
    return NextResponse.json({ breakdown: result.breakdown, placed: result.placed, missing: result.missing })
  } catch (e) {
    console.error('Place marks failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not place the marks' }, { status: 500 })
  }
}

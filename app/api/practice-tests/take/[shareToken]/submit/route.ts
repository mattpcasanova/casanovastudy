import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sanitizeResponses, scoreSubmission } from '@/lib/practice-test-scoring'

const MAX_NAME_LEN = 80
const MAX_RESPONSES = 200

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params
    if (!shareToken) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const studentName = typeof body.studentName === 'string' ? body.studentName.trim() : ''
    if (!studentName) return NextResponse.json({ error: 'Please enter your name before submitting' }, { status: 400 })
    if (studentName.length > MAX_NAME_LEN) return NextResponse.json({ error: 'Name too long' }, { status: 400 })

    if (!body.responses || typeof body.responses !== 'object') {
      return NextResponse.json({ error: 'responses must be an object' }, { status: 400 })
    }
    if (Object.keys(body.responses).length > MAX_RESPONSES) {
      return NextResponse.json({ error: 'Too many responses' }, { status: 400 })
    }
    const responses = sanitizeResponses(body.responses)

    const supabase = createAdminClient()
    const { data: test, error: lookupError } = await supabase
      .from('practice_tests')
      .select('id, answer_key, is_active')
      .eq('share_token', shareToken)
      .maybeSingle()
    if (lookupError || !test) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!test.is_active) return NextResponse.json({ error: 'This practice test is not currently accepting responses' }, { status: 410 })

    const { scoreTotal, scoreMax, bigIdeaBreakdown } = scoreSubmission(test.answer_key ?? {}, responses)

    const { data: inserted, error: insertError } = await supabase
      .from('practice_test_submissions')
      .insert({
        practice_test_id: test.id,
        student_name: studentName,
        responses,
        score_total: scoreTotal,
        score_max: scoreMax,
        big_idea_breakdown: bigIdeaBreakdown,
      })
      .select('id, submitted_at')
      .single()
    if (insertError || !inserted) {
      console.error('Error inserting practice test submission:', insertError)
      return NextResponse.json({ error: 'Failed to record your submission' }, { status: 500 })
    }

    return NextResponse.json({
      submissionId: inserted.id,
      scoreTotal,
      scoreMax,
      bigIdeaBreakdown,
    })
  } catch (error) {
    console.error('Public submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { PracticeTestPublicMeta } from '@/lib/types/practice-test'

// Public: returns test metadata + questions_content WITHOUT the answer key.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params
    if (!shareToken) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('practice_tests')
      // NOTE: do NOT select answer_key here. Project subset only.
      .select('id, title, description, questions_content, is_active, answer_key')
      .eq('share_token', shareToken)
      .maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!data.is_active) return NextResponse.json({ error: 'This practice test is not currently accepting responses' }, { status: 410 })

    const questionCount = data.answer_key && typeof data.answer_key === 'object'
      ? Object.keys(data.answer_key).length
      : 0

    const payload: PracticeTestPublicMeta = {
      id: data.id,
      title: data.title,
      description: data.description,
      questions_content: data.questions_content,
      is_active: data.is_active,
      question_count: questionCount,
    }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Public take fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

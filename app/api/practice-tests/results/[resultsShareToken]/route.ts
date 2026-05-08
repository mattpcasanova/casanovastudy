import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { buildResultsPayload } from '@/lib/practice-test-results'

// Public: read-only results dashboard for the colleague's URL.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resultsShareToken: string }> }
) {
  try {
    const { resultsShareToken } = await params
    if (!resultsShareToken) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = createAdminClient()
    const { data: test } = await supabase
      .from('practice_tests')
      .select('id')
      .eq('results_share_token', resultsShareToken)
      .maybeSingle()
    if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const payload = await buildResultsPayload(test.id)
    if (!payload) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Public results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

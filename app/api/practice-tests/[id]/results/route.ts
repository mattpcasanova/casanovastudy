import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { buildResultsPayload } from '@/lib/practice-test-results'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const supabase = createAdminClient()
    const { data: test } = await supabase
      .from('practice_tests')
      .select('id, teacher_id')
      .eq('id', id)
      .single()
    if (!test) return NextResponse.json({ error: 'Practice test not found' }, { status: 404 })
    if (test.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not your practice test' }, { status: 403 })
    }

    const payload = await buildResultsPayload(id)
    if (!payload) return NextResponse.json({ error: 'Practice test not found' }, { status: 404 })
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Practice test results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

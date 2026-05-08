import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { AnswerKey } from '@/lib/types/practice-test'
import { isAnswerLetter, isBigIdea } from '@/lib/practice-test-scoring'

const MAX_TITLE_LEN = 200

function sanitizeAnswerKey(input: unknown): AnswerKey | null {
  if (!input || typeof input !== 'object') return null
  const out: AnswerKey = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const qNum = Number(k)
    if (!Number.isInteger(qNum) || qNum < 1) continue
    if (!v || typeof v !== 'object') continue
    const entry = v as Record<string, unknown>
    if (!isAnswerLetter(entry.answer)) continue
    if (!isBigIdea(entry.bigIdea)) continue
    out[String(qNum)] = { answer: entry.answer, bigIdea: entry.bigIdea }
  }
  return out
}

async function getOwnedTest(userId: string, testId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('practice_tests')
    .select('id, teacher_id, title, description, answer_key, questions_content, share_token, results_share_token, is_active, created_at, updated_at')
    .eq('id', testId)
    .single()
  if (error || !data) return { error: 'Practice test not found', status: 404 as const }
  if (data.teacher_id !== userId) return { error: 'Not your practice test', status: 403 as const }
  return { test: data }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    const { id } = await params
    const result = await getOwnedTest(user.id, id)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ test: result.test })
  } catch (error) {
    console.error('Get practice test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    const { id } = await params
    const owned = await getOwnedTest(user.id, id)
    if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status })

    const body = await request.json()
    const update: Record<string, unknown> = {}

    if (typeof body.title === 'string') {
      const t = body.title.trim()
      if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      if (t.length > MAX_TITLE_LEN) return NextResponse.json({ error: 'Title too long' }, { status: 400 })
      update.title = t
    }
    if ('description' in body) {
      update.description = typeof body.description === 'string' ? body.description : null
    }
    if ('is_active' in body) {
      update.is_active = Boolean(body.is_active)
    }
    if ('answer_key' in body) {
      const cleaned = sanitizeAnswerKey(body.answer_key)
      if (cleaned === null) return NextResponse.json({ error: 'Invalid answer_key shape' }, { status: 400 })
      update.answer_key = cleaned
    }
    if ('questions_content' in body) {
      // Loose validation — questions_content is a free-form blob the teacher pastes in.
      if (body.questions_content !== null && typeof body.questions_content !== 'object') {
        return NextResponse.json({ error: 'questions_content must be an object or null' }, { status: 400 })
      }
      update.questions_content = body.questions_content
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ test: owned.test })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('practice_tests')
      .update(update)
      .eq('id', id)
      .eq('teacher_id', user.id)
      .select('id, title, description, answer_key, questions_content, share_token, results_share_token, is_active, created_at, updated_at')
      .single()

    if (error || !data) {
      console.error('Error updating practice test:', error)
      return NextResponse.json({ error: 'Failed to update practice test' }, { status: 500 })
    }
    return NextResponse.json({ test: data })
  } catch (error) {
    console.error('Update practice test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    const { id } = await params
    const owned = await getOwnedTest(user.id, id)
    if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status })

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('practice_tests')
      .delete()
      .eq('id', id)
      .eq('teacher_id', user.id)
    if (error) {
      console.error('Error deleting practice test:', error)
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete practice test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

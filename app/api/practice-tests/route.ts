import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

const MAX_TITLE_LEN = 200

function newToken(): string {
  return randomBytes(24).toString('base64url')
}

// GET — Teacher's practice tests with submission counts.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: tests, error } = await supabase
      .from('practice_tests')
      .select('id, title, description, share_token, results_share_token, is_active, answer_key, created_at, updated_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching practice tests:', error)
      return NextResponse.json({ error: 'Failed to fetch practice tests' }, { status: 500 })
    }
    if (!tests || tests.length === 0) {
      return NextResponse.json({ tests: [] })
    }

    const ids = tests.map(t => t.id)
    const { data: submissions } = await supabase
      .from('practice_test_submissions')
      .select('practice_test_id, score_total, score_max')
      .in('practice_test_id', ids)

    const stats = new Map<string, { count: number; totalPct: number }>()
    for (const s of submissions ?? []) {
      const cur = stats.get(s.practice_test_id) ?? { count: 0, totalPct: 0 }
      cur.count += 1
      const pct = s.score_max > 0 ? (s.score_total / s.score_max) * 100 : 0
      cur.totalPct += pct
      stats.set(s.practice_test_id, cur)
    }

    const result = tests.map(t => {
      const s = stats.get(t.id)
      const answerKeyCount = t.answer_key && typeof t.answer_key === 'object'
        ? Object.keys(t.answer_key).length
        : 0
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        share_token: t.share_token,
        results_share_token: t.results_share_token,
        is_active: t.is_active,
        question_count: answerKeyCount,
        submission_count: s?.count ?? 0,
        avg_score_pct: s && s.count > 0 ? s.totalPct / s.count : null,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }
    })

    return NextResponse.json({ tests: result })
  } catch (error) {
    console.error('List practice tests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — Create a new practice test.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (title.length > MAX_TITLE_LEN) return NextResponse.json({ error: 'Title too long' }, { status: 400 })

    const description = typeof body.description === 'string' ? body.description : null

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('user_profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create practice tests' }, { status: 403 })
    }

    const { data: created, error: insertError } = await supabase
      .from('practice_tests')
      .insert({
        teacher_id: user.id,
        title,
        description,
        share_token: newToken(),
        results_share_token: newToken(),
      })
      .select('id, title, description, share_token, results_share_token, is_active, created_at, updated_at')
      .single()

    if (insertError || !created) {
      console.error('Error creating practice test:', insertError)
      return NextResponse.json({ error: 'Failed to create practice test' }, { status: 500 })
    }

    return NextResponse.json({ test: created }, { status: 201 })
  } catch (error) {
    console.error('Create practice test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

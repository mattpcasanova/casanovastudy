import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { ClaudeService, type ExplainTurn } from '@/lib/claude-api'

// The Explain panel (components/explain/): a short tutor reply about a
// highlighted passage, a question the student typed, or a quiz question.
// Signed-in users only; the guide's title/subject/level are looked up here.
// Replies stream back as plain text.

const HOURLY_LIMIT = 40
const DAILY_LIMIT = 150
const MAX_TURNS = 12
const MAX_CHARS = 6000
const askedBy = new Map<string, number[]>() // per-instance, best-effort

function overLimit(userId: string): string | null {
  const now = Date.now()
  const recent = (askedBy.get(userId) ?? []).filter((t) => t > now - 86_400_000)
  askedBy.set(userId, recent)
  if (recent.filter((t) => t > now - 3_600_000).length >= HOURLY_LIMIT) return 'You’ve asked a lot in the last hour. Take a short break and try again soon.'
  if (recent.length >= DAILY_LIMIT) return 'You’ve reached today’s limit for explanations. It resets tomorrow.'
  recent.push(now)
  return null
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in to ask for explanations.' }, { status: 401 })

  let body: { studyGuideId?: string; turns?: ExplainTurn[] }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const turns = (Array.isArray(body.turns) ? body.turns : [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }))
  if (!turns.length || turns[0].role !== 'user' || turns[turns.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Nothing to explain' }, { status: 400 })
  }
  if (!body.studyGuideId) return NextResponse.json({ error: 'Missing study guide' }, { status: 400 })

  const { data: guide } = await createAdminClient()
    .from('study_guides').select('title, subject, grade_level, topic_focus').eq('id', body.studyGuideId).maybeSingle()
  if (!guide) return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })

  const limited = overLimit(user.id)
  if (limited) return NextResponse.json({ error: limited }, { status: 429 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claude = new ClaudeService()
        for await (const text of claude.explainStream({ guideTitle: guide.title, subject: guide.subject, gradeLevel: guide.grade_level, topic: guide.topic_focus ?? undefined, turns })) {
          controller.enqueue(encoder.encode(text))
        }
      } catch (error) {
        console.error('Explain error:', error)
        controller.enqueue(encoder.encode('\n\n_Sorry, something went wrong. Please try again._'))
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { ClaudeService, type ExplainTurn } from '@/lib/claude-api'
import { meterExplain, planBlockResponse, releaseUsage } from '@/lib/plans'

// The Explain panel (components/explain/): a short tutor reply about a
// highlighted passage, a question the student typed, or a quiz question.
// Signed-in users only; the guide's title/subject/level are looked up here.
// Replies stream back as plain text. Every message (follow-ups too) counts
// toward the plan's rolling daily limit (lib/plan-rules.ts); the
// X-Usage-Remaining header tells the panel how many are left.

const MAX_TURNS = 12
const MAX_CHARS = 6000

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

  const meter = await meterExplain(user.id)
  if (meter.block) return planBlockResponse(meter.block)

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
        await releaseUsage(meter.eventId)
        controller.enqueue(encoder.encode('\n\n_Sorry, something went wrong. Please try again._'))
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Usage-Remaining': String(meter.remaining),
      'X-Usage-Limit': String(meter.limit),
      'X-Plan': meter.plan,
    },
  })
}

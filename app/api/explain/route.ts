import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { ClaudeService, type ExplainTurn } from '@/lib/claude-api'
import { hasPremiumFeatures, meterExplain, planBlockResponse, releaseUsage } from '@/lib/plans'
import { buildProfile, learnerHistoryNote } from '@/lib/learner/profile'
import { consentBlockResponse } from '@/lib/consent'
import { aiRuleForGuide } from '@/lib/practice/server'
import { describeAiUse } from '@/lib/practice/assignments'

// The Explain panel (components/explain/): a short tutor reply about a
// highlighted passage, a question the student typed, or a quiz question.
// Signed-in users only; the guide's title/subject/level are looked up here.
// Replies stream back as plain text. Every message (follow-ups too) counts
// toward the plan's rolling daily limit (lib/plan-rules.ts); the
// X-Usage-Remaining header tells the panel how many are left.
// On a guide assigned to the student (still open), the teacher's AI help
// setting applies however the guide was opened: off = 403 code 'ai_off',
// tutor = ASSIGNED_TUTOR_RULES; every message is logged for the teacher.

const MAX_TURNS = 12
const MAX_CHARS = 6000
// Photos of the student's work ("Check my work"): JPEGs prepared in the
// browser (~1568px long edge), at most the 2 most recent kept per request.
const MAX_IMAGE_CHARS = 2_500_000
const MAX_IMAGES = 2
const JPEG_DATA_URL = /^data:image\/jpeg;base64,(\/9j\/[A-Za-z0-9+/=]+)$/

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in to ask for explanations.' }, { status: 401 })
  const consentBlock = await consentBlockResponse(user.id) // under-13s need a parent's OK first
  if (consentBlock) return consentBlock

  let body: { studyGuideId?: string; turns?: Array<{ role?: string; content?: unknown; image?: unknown }> }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const turns: ExplainTurn[] = (Array.isArray(body.turns) ? body.turns : [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-MAX_TURNS)
    .map((t) => {
      const turn: ExplainTurn = { role: t.role as ExplainTurn['role'], content: (t.content as string).slice(0, MAX_CHARS) }
      const img = t.role === 'user' && typeof t.image === 'string' && t.image.length <= MAX_IMAGE_CHARS ? t.image.match(JPEG_DATA_URL)?.[1] : undefined
      if (img) turn.image = img
      return turn
    })
  // Only the latest photos go to the model; older ones are referred to in words.
  let kept = 0
  for (let i = turns.length - 1; i >= 0; i--) {
    if (!turns[i].image) continue
    if (++kept > MAX_IMAGES) { delete turns[i].image; turns[i].content += '\n(I attached a photo here earlier.)' }
  }
  if (!turns.length || turns[0].role !== 'user' || turns[turns.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Nothing to explain' }, { status: 400 })
  }
  if (!body.studyGuideId) return NextResponse.json({ error: 'Missing study guide' }, { status: 400 })

  const { data: guide } = await createAdminClient()
    .from('study_guides').select('title, subject, grade_level, topic_focus').eq('id', body.studyGuideId).maybeSingle()
  if (!guide) return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })

  const rule = await aiRuleForGuide(createAdminClient(), user.id, body.studyGuideId)
  if (rule?.aiHelp === 'off') {
    return NextResponse.json({ error: 'Your teacher turned off AI help for this assignment.', code: 'ai_off' }, { status: 403 })
  }

  const meter = await meterExplain(user.id)
  if (!meter.block && rule) {
    const last = turns[turns.length - 1]
    const use = describeAiUse(last.content, !!last.image)
    const { error: logError } = await createAdminClient().from('assignment_ai_uses').insert(rule.uses.map((u) => ({
      assignment_id: u.assignmentId, roster_id: u.rosterId, student_user_id: user.id, kind: use.kind, message: use.message, ai_help: rule.aiHelp,
    })))
    if (logError) console.error('AI use log failed:', logError)
  }
  if (meter.block) return planBlockResponse(meter.block)

  // Premium: let the tutor know which topics this student keeps missing.
  let learnerNote = ''
  if (await hasPremiumFeatures(user.id)) {
    const { data: history } = await createAdminClient()
      .from('study_results').select('subject, topic, correct, answered_at, study_guide_id')
      .eq('user_id', user.id).order('answered_at', { ascending: false }).limit(2000)
    if (history?.length) {
      learnerNote = learnerHistoryNote(buildProfile(history), { subject: guide.subject, text: [guide.title, guide.topic_focus, turns[turns.length - 1].content.slice(0, 600)].filter(Boolean).join('\n') }, 'tutor')
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claude = new ClaudeService()
        for await (const text of claude.explainStream({ guideTitle: guide.title, subject: guide.subject, gradeLevel: guide.grade_level, topic: guide.topic_focus ?? undefined, learnerNote, assignedTutor: rule?.aiHelp === 'tutor', turns })) {
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
      ...(rule ? { 'X-Assigned-Ai': rule.aiHelp } : {}),
    },
  })
}

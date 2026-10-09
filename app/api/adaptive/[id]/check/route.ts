import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { consentBlockResponse } from '@/lib/consent'
import { meterAdaptiveStep, planBlockResponse, releaseUsage } from '@/lib/plans'
import { parseAdaptive } from '@/lib/adaptive/format'

// Checks an "explain it in your own words" answer in adaptive practice (Haiku,
// ~$0.001). The question and model answer come from the saved guide, never the
// client. Feedback only: these answers don't count toward mastery, so a
// grading slip can't derail the session. Capped daily (lib/plans.ts).

const MAX_ANSWER = 3000

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in to have your answer checked.' }, { status: 401 })
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock

  const { id } = await params
  let body: { questionId?: string; answer?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const answer = String(body.answer ?? '').trim()
  if (!answer) return NextResponse.json({ error: 'Write an answer first.' }, { status: 400 })
  if (answer.length > MAX_ANSWER) return NextResponse.json({ error: 'That answer is too long to check.' }, { status: 400 })

  const { data: row } = await createAdminClient()
    .from('study_guides').select('format, subject, content').eq('id', id).maybeSingle()
  if (!row || row.format !== 'adaptive') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const question = parseAdaptive(row.content).questions.find((q) => q.id === body.questionId)
  if (!question || question.type !== 'explain') return NextResponse.json({ error: 'Unknown question' }, { status: 400 })

  const meter = await meterAdaptiveStep(user.id, 'adaptive_check')
  if (meter.block) return planBlockResponse(meter.block)

  try {
    const result = await new ClaudeService().gradeShortAnswer({
      question: question.prompt,
      sampleAnswer: question.answers[0],
      studentAnswer: answer,
      subject: row.subject,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Adaptive answer check failed:', error)
    await releaseUsage(meter.eventId)
    return NextResponse.json({ error: "Couldn't check your answer right now." }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { consentBlockResponse } from '@/lib/consent'
import { meterAdaptiveStep, planBlockResponse, releaseUsage } from '@/lib/plans'
import { parseAdaptive, refillBlock, type AdaptiveQuestion } from '@/lib/adaptive/format'
import { ADAPTIVE_RULES } from '@/lib/adaptive/engine'

// More questions for one concept of an adaptive practice session (the owner's
// own guide only). Guardrails: ADAPTIVE_RULES.maxRefills per session (counted
// from the REFILL blocks already in the guide) and a daily per-user cap
// (lib/plans.ts ADAPTIVE_SAFETY). The new block is appended to the guide, so
// existing question ids never change.

const BATCH = 4
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock

  const { id } = await params
  let body: { conceptId?: string; level?: number; missed?: Array<{ q?: string; given?: string }> }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('study_guides')
    .select('id, user_id, format, title, subject, grade_level, content')
    .eq('id', id)
    .maybeSingle()
  if (!row || row.format !== 'adaptive') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.user_id !== user.id) return NextResponse.json({ error: 'Only the owner can add questions. Save a copy to My Guides first.' }, { status: 403 })

  const guide = parseAdaptive(row.content)
  if (guide.refills >= ADAPTIVE_RULES.maxRefills) {
    return NextResponse.json({ error: 'This session has all the new questions it can get. Start a new session to keep going.', code: 'session_full' }, { status: 409 })
  }
  const concept = guide.concepts.find((c) => c.id === body.conceptId)
  if (!concept) return NextResponse.json({ error: 'Unknown concept' }, { status: 400 })
  const level = body.level === 1 || body.level === 3 ? body.level : 2

  const meter = await meterAdaptiveStep(user.id, 'adaptive_refill')
  if (meter.block) return planBlockResponse(meter.block)

  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  const answerText = (q: AdaptiveQuestion, given: string) => {
    if (q.type === 'mc' || q.type === 'tf') return q.options[Number(given)] ?? given
    return given
  }
  const correctText = (q: AdaptiveQuestion) => (q.type === 'mc' || q.type === 'tf' ? q.options[q.correct] : q.answers.join(' or '))
  const missed = (Array.isArray(body.missed) ? body.missed : []).slice(0, 4).flatMap((m) => {
    const q = byId.get(clip(m.q, 20))
    if (!q || q.conceptId !== concept.id || q.type === 'explain') return []
    return [{ question: q.prompt.slice(0, 800), given: clip(answerText(q, clip(m.given, 200)), 200), correct: correctText(q).slice(0, 200) }]
  })
  const existing = guide.questions.filter((q) => q.conceptId === concept.id).map((q) => q.prompt.replace(/\s+/g, ' ').slice(0, 300))

  try {
    const { text } = await new ClaudeService().generateAdaptiveRefill({
      guideTitle: row.title,
      subject: row.subject,
      gradeLevel: row.grade_level,
      concept,
      existing,
      missed,
      level,
      count: BATCH,
    })
    // Parse the batch on its own (under a stand-in concept) and keep the well-formed, gradeable ones.
    const fresh = parseAdaptive(`CONCEPT: ${concept.name}\n\n${text}`).questions
      .filter((q) => q.type !== 'explain')
      .slice(0, BATCH)
      .map(({ id: _id, conceptId: _c, ...q }) => q)
    if (!fresh.length) throw new Error('No usable questions came back')

    // Re-read right before writing so a save in between isn't overwritten.
    const { data: latest } = await supabase.from('study_guides').select('content').eq('id', id).single()
    const current = latest?.content ?? row.content
    if (parseAdaptive(current).refills >= ADAPTIVE_RULES.maxRefills) {
      await releaseUsage(meter.eventId)
      return NextResponse.json({ error: 'This session has all the new questions it can get.', code: 'session_full' }, { status: 409 })
    }
    const content = `${current.trimEnd()}\n\n${refillBlock(concept.id, fresh)}\n`
    const { error } = await supabase.from('study_guides').update({ content }).eq('id', id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ content, added: fresh.length })
  } catch (error) {
    console.error('Adaptive refill failed:', error)
    await releaseUsage(meter.eventId) // nothing was added, so it doesn't count toward today's cap
    return NextResponse.json({ error: "Couldn't write new questions right now." }, { status: 502 })
  }
}

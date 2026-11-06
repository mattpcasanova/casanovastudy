import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { consentBlockResponse } from '@/lib/consent'
import { ClaudeService } from '@/lib/claude-api'
import { normalizeLanguage } from '@/lib/study-options'
import { attemptsLeft } from '@/lib/practice/assignments'
import { myAssignedRow } from '@/lib/practice/server'
import { MAX_VERSIONS, sameShape } from '@/lib/formats/versions'
import { meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { translationForStudent } from '@/lib/guide-edit/translation-server'

// A new version of a quiz or practice set for another attempt (migration 083).
//   POST { version, assignmentId? } -> { status: 'ready', content } | { status: 'pending' } | { status: 'failed' }
//   GET  ?version=&assignmentId=     -> the same, without starting anything (polling)
// Assigned: version N is for attempt N + 1 and needs N counted attempts already
// (and one left), and is free. Own retries count as a guide (meterGuide: today's guide limit).
// Written once and kept, so a reload shows the same questions.

export const maxDuration = 300

const STALE_MS = 4 * 60 * 1000
type Supabase = ReturnType<typeof createAdminClient>

async function findRow(supabase: Supabase, guideId: string, userId: string, assignmentId: string | null, version: number) {
  let q = supabase.from('guide_versions').select('id, status, content, updated_at').eq('study_guide_id', guideId).eq('user_id', userId).eq('version', version)
  q = assignmentId ? q.eq('assignment_id', assignmentId) : q.is('assignment_id', null)
  const { data } = await q.maybeSingle()
  return data
}

function reply(row: { status: string; content: string | null } | null) {
  if (!row) return NextResponse.json({ status: 'none' })
  if (row.status === 'ready' && row.content) return NextResponse.json({ status: 'ready', content: row.content }, { headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ status: row.status })
}

async function readParams(request: NextRequest, body?: { version?: unknown; assignmentId?: unknown }) {
  const url = new URL(request.url)
  const version = Number(body ? body.version : url.searchParams.get('version'))
  const raw = body ? body.assignmentId : url.searchParams.get('assignmentId')
  const assignmentId = typeof raw === 'string' && /^[0-9a-f-]{36}$/i.test(raw) ? raw : null
  return { version, assignmentId }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const { id } = await params
  const { version, assignmentId } = await readParams(request)
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(version) || version < 1 || version > MAX_VERSIONS) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return reply(await findRow(createAdminClient(), id, user.id, assignmentId, version))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock
  const { id } = await params
  let body: { version?: unknown; assignmentId?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const { version, assignmentId } = await readParams(request, body)
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(version) || version < 1 || version > MAX_VERSIONS) return NextResponse.json({ error: 'Invalid version' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: guide } = await supabase.from('study_guides').select('id, user_id, format, content, title, subject, grade_level, language').eq('id', id).maybeSingle()
  if (!guide || (guide.format !== 'quiz' && guide.format !== 'practice') || !guide.content) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A student given this assignment in another language gets new versions in it too.
  let source = { content: guide.content as string, language: normalizeLanguage(guide.language) }
  if (assignmentId) {
    const { data: a } = await supabase.from('practice_assignments').select('id, study_guide_id, max_attempts, grading').eq('id', assignmentId).maybeSingle()
    if (!a || a.study_guide_id !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const rosterId = await myAssignedRow(supabase, a.id, user.id)
    if (!rosterId) return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 })
    const { data: tries } = await supabase.from('practice_attempts').select('counted, auto, pct, correct, total, finished_at').eq('assignment_id', a.id).eq('roster_id', rosterId)
    const list = (tries ?? []).map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, auto: !!t.auto, finishedAt: t.finished_at as string }))
    const used = list.filter((t) => t.counted && !t.auto).length
    // Version N is for attempt N + 1: only once N attempts are in, and while one is left.
    const translation = await translationForStudent(supabase, a.id, rosterId, guide)
    if (translation) source = { content: translation.content, language: translation.language }
    if (version > Math.min(used, MAX_VERSIONS) || attemptsLeft(a.max_attempts, list) === 0) return NextResponse.json({ error: 'No attempt to prepare' }, { status: 409 })
  }

  // Their own retry with new questions counts as a guide (same daily limit as making one);
  // a teacher's assigned attempts don't, or a student at the limit couldn't do their assignment.
  // Only charged when this request is the one that writes it (not for a version already written).
  const existingFirst = await findRow(supabase, id, user.id, assignmentId, version)
  let usageEvent: number | null = null
  if (!assignmentId && existingFirst?.status !== 'ready' && !(existingFirst?.status === 'pending' && Date.now() - Date.parse(existingFirst.updated_at as string) < STALE_MS)) {
    const metered = await meterGuide(user.id, { format: guide.format as string })
    if (metered.block) return planBlockResponse(metered.block)
    usageEvent = metered.eventId
  }

  // Claim the slot: insert a pending row; if one exists, use it or take over a stale/failed one.
  const existing = existingFirst
  if (existing) {
    if (existing.status === 'ready') return reply(existing)
    const fresh = Date.now() - Date.parse(existing.updated_at as string) < STALE_MS
    if (existing.status === 'pending' && fresh) return reply(existing)
    const { data: claimed } = await supabase.from('guide_versions').update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', existing.id).eq('updated_at', existing.updated_at).select('id')
    if (!claimed?.length) { await releaseUsage(usageEvent); return NextResponse.json({ status: 'pending' }) }
  } else {
    const { error } = await supabase.from('guide_versions').insert({ study_guide_id: id, user_id: user.id, assignment_id: assignmentId, version, status: 'pending' })
    if (error) { await releaseUsage(usageEvent); return NextResponse.json({ status: 'pending' }) } // another tab just claimed it
  }

  const save = (patch: Record<string, unknown>) => {
    let q = supabase.from('guide_versions').update({ ...patch, updated_at: new Date().toISOString() }).eq('study_guide_id', id).eq('user_id', user.id).eq('version', version)
    q = assignmentId ? q.eq('assignment_id', assignmentId) : q.is('assignment_id', null)
    return q
  }
  try {
    const claude = new ClaudeService()
    const input = { content: source.content, format: guide.format as 'quiz' | 'practice', title: guide.title as string, subject: guide.subject ?? undefined, gradeLevel: guide.grade_level ?? undefined, language: source.language, version }
    let out = await claude.writeNewVersion(input)
    let cost = out.usage.cost
    // The new version has to line up item for item with the original (the teacher's report and retries depend on it).
    if (!sameShape(guide.format as 'quiz' | 'practice', guide.content as string, out.text)) {
      out = await claude.writeNewVersion(input)
      cost += out.usage.cost
      if (!sameShape(guide.format as 'quiz' | 'practice', guide.content as string, out.text)) {
        await save({ status: 'failed', token_usage: { cost } })
        await releaseUsage(usageEvent)
        return NextResponse.json({ status: 'failed' })
      }
    }
    await save({ status: 'ready', content: out.text, token_usage: { ...out.usage, cost } })
    return NextResponse.json({ status: 'ready', content: out.text }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('New version failed:', e)
    await save({ status: 'failed' })
    await releaseUsage(usageEvent)
    return NextResponse.json({ status: 'failed' })
  }
}


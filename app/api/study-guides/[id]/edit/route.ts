import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { consentBlockResponse } from '@/lib/consent'
import { ClaudeService } from '@/lib/claude-api'
import { meterExplain, planBlockResponse, releaseUsage } from '@/lib/plans'
import { normalizeLanguage } from '@/lib/study-options'
import { normalizeStandards } from '@/lib/standards'
import { GUIDE_TITLE_MAX, editProblem, isEditableFormat, splitPieces, type EditableFormat } from '@/lib/guide-edit/pieces'

// Editing a guide you own (the Edit page, lib/guide-edit/pieces.ts).
//   GET   -> { locked }  locked = assigned to students: wording can change, the items can't
//   PATCH { title?, standards?, content? } -> { ok }
//   POST  { piece, instruction } -> { piece }  "Change it for me" on one piece (counts as one explanation)
// Identity comes from the session; the guide must be the caller's own.

export const maxDuration = 120

type Supabase = ReturnType<typeof createAdminClient>
const GUIDE_COLUMNS = 'id, user_id, format, content, title, subject, grade_level, language'

async function ownGuide(request: NextRequest, id: string) {
  const user = await getRequestUser(request)
  if (!user) return { error: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const supabase = createAdminClient()
  const { data: guide } = await supabase.from('study_guides').select(GUIDE_COLUMNS).eq('id', id).maybeSingle()
  if (!guide) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  if (guide.user_id !== user.id) return { error: NextResponse.json({ error: 'You can only edit your own guides. Save it to My Guides first.' }, { status: 403 }) }
  return { user, supabase, guide }
}

/** Assigned to students: their answers and the report are matched to items by position. */
async function isLocked(supabase: Supabase, guideId: string): Promise<boolean> {
  const { count } = await supabase.from('practice_assignments').select('id', { count: 'exact', head: true }).eq('study_guide_id', guideId)
  return (count ?? 0) > 0
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const own = await ownGuide(request, id)
  if ('error' in own) return own.error
  return NextResponse.json({ locked: await isLocked(own.supabase, id) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const own = await ownGuide(request, id)
  if ('error' in own) return own.error
  const { supabase, guide } = own
  let body: { title?: unknown; standards?: unknown; content?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string') {
    const title = body.title.replace(/\s+/g, ' ').trim().slice(0, GUIDE_TITLE_MAX)
    if (!title) return NextResponse.json({ error: 'The guide needs a name.' }, { status: 400 })
    patch.title = title
  }
  if (typeof body.standards === 'string') patch.standards = normalizeStandards(body.standards) || null
  if (typeof body.content === 'string') {
    if (!isEditableFormat(guide.format)) return NextResponse.json({ error: 'This kind of guide can\'t be edited here.' }, { status: 400 })
    const content = body.content.replace(/\r\n?/g, '\n')
    const problem = editProblem(guide.format, String(guide.content ?? ''), content, await isLocked(supabase, id))
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    patch.content = content
  }
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true })

  const { error } = await supabase.from('study_guides').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', guide.user_id)
  if (error) { console.error('Guide edit failed:', error); return NextResponse.json({ error: 'Could not save your changes.' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const own = await ownGuide(request, id)
  if ('error' in own) return own.error
  const { user, supabase, guide } = own
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock
  if (!isEditableFormat(guide.format)) return NextResponse.json({ error: 'This kind of guide can\'t be edited here.' }, { status: 400 })
  const format: EditableFormat = guide.format

  let body: { piece?: unknown; instruction?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const piece = typeof body.piece === 'string' ? body.piece.trim() : ''
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 600) : ''
  if (!piece || piece.length > 12000) return NextResponse.json({ error: 'That part is too long to change this way. Edit it by hand instead.' }, { status: 400 })
  if (instruction.length < 3) return NextResponse.json({ error: 'Say what you want changed.' }, { status: 400 })
  const before = splitPieces(format, piece)
  if (before.length !== 1) return NextResponse.json({ error: 'Pick one part to change.' }, { status: 400 })

  const meter = await meterExplain(user.id)
  if (meter.block) return planBlockResponse(meter.block)
  try {
    const out = await new ClaudeService().revisePiece({
      format, piece, instruction, title: guide.title as string, subject: guide.subject ?? undefined, gradeLevel: guide.grade_level ?? undefined,
      language: normalizeLanguage(guide.language), keepShape: await isLocked(supabase, id),
    })
    // It has to come back as one part of the same kind, or the rest of the guide shifts.
    const after = splitPieces(format, out.text)
    if (after.length !== 1 || after[0].kind !== before[0].kind) {
      await releaseUsage(meter.eventId)
      return NextResponse.json({ error: 'That change didn\'t come out as one clean part. Try wording it differently, or edit it by hand.' }, { status: 422 })
    }
    return NextResponse.json({ piece: after[0].text })
  } catch (e) {
    console.error('Revise piece failed:', e)
    await releaseUsage(meter.eventId)
    return NextResponse.json({ error: 'Could not make that change. Please try again.' }, { status: 500 })
  }
}

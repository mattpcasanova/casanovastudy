import { NextRequest, NextResponse } from 'next/server'
import { ownedAssignment as owned } from '@/lib/practice/server'
import { meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { GUIDE_LANGUAGES, normalizeLanguage } from '@/lib/study-options'
import { ASSIGN_LANGUAGE_FORMATS } from '@/lib/guide-edit/translation'
import { TRANSLATE_MAX_CHARS, findTranslation, makeTranslation, type GuideRow } from '@/lib/guide-edit/translation-server'

// Give some students of an assignment the practice in another language (teacher).
//   POST { language, rosterIds } -> { ok, made }
// The students listed get that language; students who had it and aren't listed go
// back to the original. The first time a language is used the guide's translation
// is written (30-90 s, counts as a guide) and kept as the teacher's own guide.
// It is the same assignment either way: questions line up by position, so the
// scores, the report and the gradebook don't change.

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await owned(request, id)
  if ('error' in r) return r.error
  const { supabase, assignment, userId } = r
  let body: { language?: unknown; rosterIds?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!GUIDE_LANGUAGES.some((l) => l.value === body.language)) return NextResponse.json({ error: 'Pick a language.' }, { status: 400 })
  const language = normalizeLanguage(body.language)
  const wanted = Array.isArray(body.rosterIds) ? body.rosterIds.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)) : []

  const { data } = await supabase.from('study_guides').select('*').eq('id', assignment.study_guide_id).maybeSingle()
  const guide = data as GuideRow | null
  if (!guide?.content || !(ASSIGN_LANGUAGE_FORMATS as readonly string[]).includes(guide.format)) return NextResponse.json({ error: 'This practice can\'t be given in another language.' }, { status: 400 })
  if (normalizeLanguage(guide.language) === language) return NextResponse.json({ error: 'The practice is already in that language.' }, { status: 400 })

  let made = false
  if (wanted.length && !(await findTranslation(supabase, guide, language))) {
    if (guide.content.length > TRANSLATE_MAX_CHARS) return NextResponse.json({ error: 'This practice is too long to write in another language in one go.' }, { status: 400 })
    const meter = await meterGuide(userId, { format: guide.format })
    if (meter.block) return planBlockResponse(meter.block)
    try {
      await makeTranslation(supabase, guide, language)
      made = true
    } catch (e) {
      console.error('Assignment translation failed:', e)
      await releaseUsage(meter.eventId)
      return NextResponse.json({ error: 'Could not write it in that language. Please try again.' }, { status: 500 })
    }
  }

  const { data: rows } = await supabase.from('practice_assignment_students').select('roster_id, language').eq('assignment_id', id)
  const on = new Set(wanted)
  const set = (rows ?? []).filter((x) => on.has(x.roster_id as string) && x.language !== language).map((x) => x.roster_id as string)
  const clear = (rows ?? []).filter((x) => x.language === language && !on.has(x.roster_id as string)).map((x) => x.roster_id as string)
  if (set.length) await supabase.from('practice_assignment_students').update({ language }).eq('assignment_id', id).in('roster_id', set)
  if (clear.length) await supabase.from('practice_assignment_students').update({ language: null }).eq('assignment_id', id).in('roster_id', clear)
  return NextResponse.json({ ok: true, made })
}

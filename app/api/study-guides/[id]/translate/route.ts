import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { consentBlockResponse } from '@/lib/consent'
import { meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { GUIDE_LANGUAGES, normalizeLanguage } from '@/lib/study-options'
import { TRANSLATE_MAX_CHARS, findTranslation, makeTranslation, type GuideRow } from '@/lib/guide-edit/translation-server'

// "Copy in another language": the caller's own guide, item for item, in another
// language, saved as a new guide (the original is untouched).
//   POST { language } -> { studyGuideId, studyGuideUrl, alreadyMade? }
// Counts as a guide (meterGuide) when one is written; a copy made before that
// still matches the original is opened instead. Quizzes, practice and adaptive
// banks must come back with the same items in the same order, or it is tried once more.

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: { language?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!GUIDE_LANGUAGES.some((l) => l.value === body.language)) return NextResponse.json({ error: 'Pick a language.' }, { status: 400 })
  const to = normalizeLanguage(body.language)

  const supabase = createAdminClient()
  const { data } = await supabase.from('study_guides').select('*').eq('id', id).maybeSingle()
  const guide = data as GuideRow | null
  if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (guide.user_id !== user.id) return NextResponse.json({ error: 'You can only copy your own guides. Save it to My Guides first.' }, { status: 403 })
  if (guide.format === 'custom' || !guide.content) return NextResponse.json({ error: 'Guides made in the custom builder can\'t be copied into another language yet.' }, { status: 400 })
  if (normalizeLanguage(guide.language) === to) return NextResponse.json({ error: 'This guide is already in that language.' }, { status: 400 })
  if (guide.content.length > TRANSLATE_MAX_CHARS) return NextResponse.json({ error: 'This guide is too long to copy into another language in one go.' }, { status: 400 })

  const existing = await findTranslation(supabase, guide, to)
  if (existing) return NextResponse.json({ studyGuideId: existing.id, studyGuideUrl: `/study-guide/${existing.id}`, alreadyMade: true })

  const meter = await meterGuide(user.id, { format: guide.format })
  if (meter.block) return planBlockResponse(meter.block)
  try {
    const made = await makeTranslation(supabase, guide, to)
    return NextResponse.json({ studyGuideId: made.id, studyGuideUrl: `/study-guide/${made.id}` })
  } catch (e) {
    console.error('Translate guide failed:', e)
    await releaseUsage(meter.eventId)
    return NextResponse.json({ error: 'Could not make the copy. Please try again.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { consentBlockResponse } from '@/lib/consent'
import { meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { normalizeReadingLevel } from '@/lib/study-options'
import { TRANSLATE_MAX_CHARS, findReadingCopy, makeReadingCopy, type GuideRow } from '@/lib/guide-edit/translation-server'

// "Copy at an easier reading level": the caller's own guide, item for item with
// the same answers, in simpler words, saved as a new guide (the original is untouched).
//   POST { level } -> { studyGuideId, studyGuideUrl, alreadyMade? }
// Counts as a guide (meterGuide) when one is written; a copy made before that
// still matches the original is opened instead.

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: { level?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const level = normalizeReadingLevel(body.level)
  if (!level) return NextResponse.json({ error: 'Pick a reading level.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase.from('study_guides').select('*').eq('id', id).maybeSingle()
  const guide = data as (GuideRow & { reading_level?: string | null }) | null
  if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (guide.user_id !== user.id) return NextResponse.json({ error: 'You can only copy your own guides. Save it to My Guides first.' }, { status: 403 })
  if (guide.format === 'custom' || !guide.content) return NextResponse.json({ error: 'Guides made in the custom builder can\'t be copied at another reading level yet.' }, { status: 400 })
  if (guide.reading_level === level) return NextResponse.json({ error: 'This guide is already at that reading level.' }, { status: 400 })
  if (guide.content.length > TRANSLATE_MAX_CHARS) return NextResponse.json({ error: 'This guide is too long to rewrite in one go.' }, { status: 400 })

  const existing = await findReadingCopy(supabase, guide, level)
  if (existing) return NextResponse.json({ studyGuideId: existing.id, studyGuideUrl: `/study-guide/${existing.id}`, alreadyMade: true })

  const meter = await meterGuide(user.id, { format: guide.format })
  if (meter.block) return planBlockResponse(meter.block)
  try {
    const made = await makeReadingCopy(supabase, guide, level)
    return NextResponse.json({ studyGuideId: made.id, studyGuideUrl: `/study-guide/${made.id}` })
  } catch (e) {
    console.error('Reading-level copy failed:', e)
    await releaseUsage(meter.eventId)
    return NextResponse.json({ error: 'Could not make the copy. Please try again.' }, { status: 500 })
  }
}

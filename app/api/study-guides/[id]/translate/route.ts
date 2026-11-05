import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { consentBlockResponse } from '@/lib/consent'
import { ClaudeService } from '@/lib/claude-api'
import { meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { GUIDE_LANGUAGES, normalizeLanguage } from '@/lib/study-options'
import { sameShape } from '@/lib/formats/versions'
import { parseAdaptive } from '@/lib/adaptive/format'
import { GUIDE_TITLE_MAX } from '@/lib/guide-edit/pieces'

// "Copy in another language": the caller's own guide, item for item, in another
// language, saved as a new guide (the original is untouched).
//   POST { language } -> { studyGuideId, studyGuideUrl }
// Counts as a guide (meterGuide). Quizzes, practice and adaptive banks must come
// back with the same items in the same order, or it is tried once more.

export const maxDuration = 300

const MAX_CHARS = 120_000

function sameItems(format: string, original: string, next: string): boolean {
  if (format === 'quiz' || format === 'practice') return sameShape(format, original, next)
  if (format === 'adaptive') {
    const a = parseAdaptive(original), b = parseAdaptive(next)
    return b.questions.length === a.questions.length && b.concepts.length === a.concepts.length
  }
  // Prose: nothing to line up; just make sure it wasn't cut short.
  return next.length > original.length * 0.5
}

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
  const { data: guide } = await supabase.from('study_guides').select('*').eq('id', id).maybeSingle()
  if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (guide.user_id !== user.id) return NextResponse.json({ error: 'You can only copy your own guides. Save it to My Guides first.' }, { status: 403 })
  if (guide.format === 'custom' || !guide.content) return NextResponse.json({ error: 'Guides made in the custom builder can\'t be copied into another language yet.' }, { status: 400 })
  const from = normalizeLanguage(guide.language)
  if (from === to) return NextResponse.json({ error: 'This guide is already in that language.' }, { status: 400 })
  const content = String(guide.content)
  if (content.length > MAX_CHARS) return NextResponse.json({ error: 'This guide is too long to copy into another language in one go.' }, { status: 400 })

  const meter = await meterGuide(user.id, { format: guide.format as string })
  if (meter.block) return planBlockResponse(meter.block)

  try {
    const claude = new ClaudeService()
    const input = { content, format: guide.format as string, title: guide.title as string, from, to }
    let out = await claude.translateGuide(input)
    let cost = out.usage.cost
    if (!sameItems(guide.format, content, out.text)) {
      out = await claude.translateGuide(input)
      cost += out.usage.cost
      if (!sameItems(guide.format, content, out.text)) throw new Error('Translation did not line up with the original')
    }
    const label = GUIDE_LANGUAGES.find((l) => l.value === to)!.name
    const title = (out.title && out.title.toLowerCase() !== String(guide.title).toLowerCase() ? out.title : `${guide.title} (${label})`).slice(0, GUIDE_TITLE_MAX)
    const { data: saved, error } = await supabase.from('study_guides').insert({
      title,
      subject: guide.subject,
      grade_level: guide.grade_level,
      format: guide.format,
      content: out.text,
      topic_focus: guide.topic_focus,
      difficulty_level: guide.difficulty_level,
      additional_instructions: guide.additional_instructions,
      file_count: guide.file_count ?? 0,
      language: to,
      standards: guide.standards ?? null,
      // Not copied_from: that sends a student's copy back to an assigned original.
      token_usage: { input_tokens: out.usage.input_tokens, output_tokens: out.usage.output_tokens, total_tokens: out.usage.input_tokens + out.usage.output_tokens, cost, translated_from: guide.id },
      user_id: user.id,
    }).select('id').single()
    if (error || !saved) throw error ?? new Error('Save failed')
    return NextResponse.json({ studyGuideId: saved.id, studyGuideUrl: `/study-guide/${saved.id}` })
  } catch (e) {
    console.error('Translate guide failed:', e)
    await releaseUsage(meter.eventId)
    return NextResponse.json({ error: 'Could not make the copy. Please try again.' }, { status: 500 })
  }
}

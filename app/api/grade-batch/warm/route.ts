import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { requireTeacher } from '@/lib/api-auth'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'
import { createAdminClient } from '@/lib/supabase-server'
import { gradingChoices, settingsFromRow } from '@/lib/grading/report-settings'
import type { PaperFile } from '@/lib/grading/grade-paper'

// Batch grading, before step 2: write the cached grading prefix (instructions
// + answer key) once, so every paper in the set can start at the same time and
// read it. Takes a few seconds and costs cents; the set grades fine without it
// (the first papers then write the cache themselves), so the page ignores a
// failure here.

export const maxDuration = 60
const MAX_PAGES = 40

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const str = (v: unknown, n = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

  const { data: settingsRow } = await createAdminClient().from('teacher_report_settings').select('*').eq('user_id', user.id).maybeSingle()
  const { markingStyle } = gradingChoices(settingsFromRow(settingsRow), body.gradeScale, body.markingStyle)

  const markSchemeBody = (body.markScheme ?? {}) as { texts?: unknown; images?: unknown }
  const texts: PaperFile[] = (Array.isArray(markSchemeBody.texts) ? markSchemeBody.texts : [])
    .filter((t): t is { name?: unknown; content: string } => typeof (t as { content?: unknown })?.content === 'string' && String((t as { content: string }).content).trim().length > 0)
    .slice(0, 10)
    .map((t) => ({ buffer: Buffer.from(t.content.slice(0, 200000), 'utf-8'), name: String(t.name ?? 'answer key').slice(0, 120), type: 'text/plain' }))
  const images = await fetchUploadedImageBuffers(markSchemeBody.images, MAX_PAGES)
  const markScheme: PaperFile[] = [...texts, ...images.map((img) => ({ buffer: img.buffer, name: img.name, type: img.mediaType }))]
  if (!markScheme.length) return NextResponse.json({ error: 'No answer key' }, { status: 400 })

  try {
    const usage = await new ClaudeService().warmGradingCache({
      markSchemeText: '',
      studentExamText: '',
      markSchemeFiles: markScheme,
      additionalComments: str(body.additionalComments, 4000) ?? undefined,
      markingStyle,
    })
    return NextResponse.json({ ok: true, ...usage })
  } catch (e) {
    console.error('Grading cache warm failed:', e)
    return NextResponse.json({ error: 'Could not warm the cache' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { GRADING_MODEL } from '@/lib/claude-api'
import { createAdminClient } from '@/lib/supabase-server'
import { gradePaper, type PaperFile } from '@/lib/grading/grade-paper'
import type { GradedQuestion } from '@/lib/grading/parse'
import { normalizeScale } from '@/lib/grading/scale'
import { normalizeMarkingStyle } from '@/lib/grading/marking-style'
import { adjustedTotals, normalizeAdjustments } from '@/lib/grading/adjustments'
import { checkGrading, planBlockResponse } from '@/lib/plans'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'
import { pickUploadRefs, type UploadRef } from '@/lib/uploads/refs'

// Grade one paper again, with a note from the teacher ("the circle on Q8 is
// C", "accept 'bent' for 31d"), from the pages saved with the report
// (migration 074) and the set's answer key (grading_batches). Replaces the
// marks and feedback (edits to this report are lost; extra credit stays).
// Owner only. About a minute and ~$0.10 for a 9-page paper.

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let note = ''
  try { const body = await request.json(); note = typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : '' } catch { /* no note */ }

  const supabase = createAdminClient()
  const { data: row } = await supabase.from('grading_results').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const pages = pickUploadRefs(row.page_urls, 40)
  if (!pages.length) return NextResponse.json({ error: 'This report has no saved pages to grade from (it was graded before pages were kept).' }, { status: 409 })
  const { data: batch } = row.batch_id ? await supabase.from('grading_batches').select('mark_scheme, notes').eq('batch_id', row.batch_id).eq('user_id', user.id).maybeSingle() : { data: null }
  const scheme = (batch?.mark_scheme ?? null) as { texts?: Array<{ name: string; content: string }>; images?: UploadRef[] } | null
  if (!scheme || (!scheme.texts?.length && !scheme.images?.length)) return NextResponse.json({ error: "The set's answer key wasn't saved, so the paper can't be regraded the same way." }, { status: 409 })

  const block = await checkGrading(user.id)
  if (block) return planBlockResponse(block)

  try {
    const [schemeImages, pageImages] = await Promise.all([
      fetchUploadedImageBuffers(scheme.images ?? [], 40, user.id),
      fetchUploadedImageBuffers(pages, 40, user.id),
    ])
    const toFiles = (list: typeof pageImages): PaperFile[] => list.map((img) => ({ buffer: img.buffer, name: img.name, type: img.mediaType }))
    const markScheme: PaperFile[] = [
      ...(scheme.texts ?? []).map((t): PaperFile => ({ buffer: Buffer.from(t.content, 'utf-8'), name: t.name, type: 'text/plain' })),
      ...toFiles(schemeImages),
    ]
    const comments = [batch?.notes, note ? `NOTE FROM THE TEACHER FOR THIS REGRADE (follow it; it overrides your own reading where they differ): ${note}` : ''].filter(Boolean).join('\n\n')
    const graded = await gradePaper({
      markScheme,
      student: toFiles(pageImages),
      additionalComments: comments || undefined,
      scale: normalizeScale(row.grade_scale),
      markingStyle: normalizeMarkingStyle(row.marking_style),
    })
    const before = (Array.isArray(row.grade_breakdown) ? row.grade_breakdown : []) as GradedQuestion[]
    const possible = graded.breakdown.reduce((s, q) => s + Number(q.marksPossible || 0), 0) || graded.totalPossible
    const raw = graded.breakdown.reduce((s, q) => s + Number(q.marksAwarded || 0), 0)
    const t = adjustedTotals(raw, possible, normalizeAdjustments(row.adjustments), normalizeScale(row.grade_scale))
    const now = new Date().toISOString()
    const update = {
      grade_breakdown: graded.breakdown,
      ai_breakdown: graded.breakdown,
      content: graded.content,
      total_marks: t.marks,
      total_possible_marks: possible,
      percentage: t.percentage,
      grade: t.grade,
      token_usage: graded.usage ? { ...graded.usage, model: GRADING_MODEL, pages: pages.length, regrade: true } : row.token_usage,
      reviewed_at: null,
      updated_at: now,
    }
    const { error: saveError } = await supabase.from('grading_results').update(update).eq('id', id).eq('user_id', user.id)
    if (saveError) throw new Error(saveError.message)
    // The other members of a group paper share the marks.
    if (row.group_id) await supabase.from('grading_results').update(update).eq('group_id', row.group_id).eq('user_id', user.id).neq('id', id)
    const changed = graded.breakdown.filter((q) => {
      const old = before.find((b) => String(b.questionNumber) === String(q.questionNumber))
      return !old || Number(old.marksAwarded) !== Number(q.marksAwarded)
    }).map((q) => ({ question: q.questionNumber, before: before.find((b) => String(b.questionNumber) === String(q.questionNumber))?.marksAwarded ?? null, after: q.marksAwarded }))
    return NextResponse.json({ ok: true, totalBefore: Number(row.total_marks), totalAfter: t.marks, changed })
  } catch (e) {
    console.error('Regrade failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not regrade' }, { status: 500 })
  }
}

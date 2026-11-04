import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService, GRADING_MODEL } from '@/lib/claude-api'
import { createAdminClient } from '@/lib/supabase-server'
import { gradePaper, type PaperFile } from '@/lib/grading/grade-paper'
import { parseGradingOutput, type GradedQuestion } from '@/lib/grading/parse'
import { mergeIntoAsGraded, mergeRegraded, needsMorePages, pagesToSend, targetQuestions } from '@/lib/grading/regrade'
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
//
// With { questions: ["8", "12b"] } only those questions are graded again and
// swapped into the report; the rest (and the teacher's edits there) stay. The
// grader gets just the pages those answers are on when the first grading
// recorded them, else the whole paper. A fraction of the cost and time.

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let note = ''
  let questions: string[] = []
  try {
    const body = await request.json()
    note = typeof body?.note === 'string' ? body.note.trim().slice(0, 2000) : ''
    if (Array.isArray(body?.questions)) questions = body.questions.filter((x: unknown) => typeof x === 'string').map((x: string) => x.trim().slice(0, 50)).filter(Boolean).slice(0, 200)
  } catch { /* no note */ }

  const supabase = createAdminClient()
  const { data: row } = await supabase.from('grading_results').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const pages = pickUploadRefs(row.page_urls, 40)
  if (!pages.length) return NextResponse.json({ error: 'This report has no saved pages to grade from (it was graded before pages were kept).' }, { status: 409 })
  const { data: batch } = row.batch_id ? await supabase.from('grading_batches').select('mark_scheme, notes').eq('batch_id', row.batch_id).eq('user_id', user.id).maybeSingle() : { data: null }
  const scheme = (batch?.mark_scheme ?? null) as { texts?: Array<{ name: string; content: string }>; images?: UploadRef[] } | null
  if (!scheme || (!scheme.texts?.length && !scheme.images?.length)) return NextResponse.json({ error: "The set's answer key wasn't saved, so the paper can't be regraded the same way." }, { status: 409 })

  // Some questions only: nothing to do (and nothing spent) on a paper that doesn't have them.
  const before = (Array.isArray(row.grade_breakdown) ? row.grade_breakdown : []) as GradedQuestion[]
  const targets = questions.length ? targetQuestions(before, questions) : []
  if (questions.length && !targets.length) return NextResponse.json({ ok: true, totalBefore: Number(row.total_marks), totalAfter: Number(row.total_marks), changed: [], notRegraded: [], skipped: true })

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

    if (targets.length && targets.length < before.length) {
      const claude = new ClaudeService()
      const files = toFiles(pageImages)
      const list = targets.map((q) => ({ label: String(q.questionNumber), marks: Number(q.marksPossible || 0) }))
      const call = (pageNumbers: number[]) => claude.regradeQuestions({
        markSchemeFiles: markScheme,
        pages: pageNumbers.map((n) => files[n - 1]),
        pageNumbers,
        pageCount: files.length,
        questions: list,
        additionalComments: comments || undefined,
        markingStyle: normalizeMarkingStyle(row.marking_style),
      })
      const all = files.map((_, i) => i + 1)
      const some = pagesToSend(targets, files.length)
      let result = await call(some ?? all)
      let usage = result.usage
      let sent = (some ?? all).length
      // An answer wasn't on the pages recorded for it: grade from the whole paper.
      if (some && (needsMorePages(result.content) || !parseGradingOutput(result.content).breakdown.length)) {
        result = await call(all)
        sent = all.length
        usage = {
          input_tokens: usage.input_tokens + result.usage.input_tokens,
          output_tokens: usage.output_tokens + result.usage.output_tokens,
          total_tokens: usage.total_tokens + result.usage.total_tokens,
          cache_read_input_tokens: usage.cache_read_input_tokens + result.usage.cache_read_input_tokens,
          cache_creation_input_tokens: usage.cache_creation_input_tokens + result.usage.cache_creation_input_tokens,
        }
      }
      const merged = mergeRegraded(before, parseGradingOutput(result.content).breakdown, targets)
      const regradedLabels = targets.map((q) => String(q.questionNumber)).filter((l) => !merged.notRegraded.includes(l))
      if (!regradedLabels.length) return NextResponse.json({ error: "The grader couldn't find those questions on the paper. Try regrading the whole paper." }, { status: 502 })
      const possible = merged.breakdown.reduce((s, q) => s + Number(q.marksPossible || 0), 0) || Number(row.total_possible_marks)
      const raw = merged.breakdown.reduce((s, q) => s + Number(q.marksAwarded || 0), 0)
      const t = adjustedTotals(raw, possible, normalizeAdjustments(row.adjustments), normalizeScale(row.grade_scale))
      const now = new Date().toISOString()
      const update = {
        grade_breakdown: merged.breakdown,
        ai_breakdown: mergeIntoAsGraded(Array.isArray(row.ai_breakdown) ? row.ai_breakdown as GradedQuestion[] : null, merged.breakdown, regradedLabels),
        content: `${row.content ?? ''}\n\n--- Regraded: ${regradedLabels.join(', ')} ---\n\n${result.content}`.slice(0, 200000),
        total_marks: t.marks,
        total_possible_marks: possible,
        percentage: t.percentage,
        grade: t.grade,
        token_usage: { ...usage, model: GRADING_MODEL, pages: sent, regrade: true, questions: regradedLabels.length },
        reviewed_at: null,
        updated_at: now,
      }
      const { error: saveError } = await supabase.from('grading_results').update(update).eq('id', id).eq('user_id', user.id)
      if (saveError) throw new Error(saveError.message)
      if (row.group_id) await supabase.from('grading_results').update(update).eq('group_id', row.group_id).eq('user_id', user.id).neq('id', id)
      return NextResponse.json({ ok: true, totalBefore: Number(row.total_marks), totalAfter: t.marks, changed: merged.changed, notRegraded: merged.notRegraded })
    }
    const graded = await gradePaper({
      markScheme,
      student: toFiles(pageImages),
      additionalComments: comments || undefined,
      scale: normalizeScale(row.grade_scale),
      markingStyle: normalizeMarkingStyle(row.marking_style),
    })
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

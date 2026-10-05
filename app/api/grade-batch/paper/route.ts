import { NextRequest, NextResponse } from 'next/server'
import { GRADING_MODEL } from '@/lib/claude-api'
import { requireTeacher } from '@/lib/api-auth'
import { checkGrading, planBlockResponse } from '@/lib/plans'
import { gradePaper, markingProgress, type PaperFile } from '@/lib/grading/grade-paper'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'
import { createAdminClient } from '@/lib/supabase-server'

// Batch grading, step 2: grade one student's paper (pages already uploaded to
// Cloudinary) against the batch's mark scheme, save it with the batch id, and
// stream progress then the score (NDJSON). The browser runs a few at a time.

export const maxDuration = 300
const MAX_PAGES = 40

type TextPart = { name?: unknown; content?: unknown }

function textFiles(list: unknown): PaperFile[] {
  if (!Array.isArray(list)) return []
  return (list as TextPart[])
    .filter((t) => typeof t?.content === 'string' && t.content.trim())
    .slice(0, 10)
    .map((t) => ({ buffer: Buffer.from(String(t.content).slice(0, 200000), 'utf-8'), name: String(t.name ?? 'mark scheme').slice(0, 120), type: 'text/plain' }))
}

const toFiles = (images: Awaited<ReturnType<typeof fetchUploadedImageBuffers>>): PaperFile[] =>
  images.map((img) => ({ buffer: img.buffer, name: img.name, type: img.mediaType }))

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const batchId = String(body.batchId ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) return NextResponse.json({ error: 'Missing batch id' }, { status: 400 })
  const str = (v: unknown, n = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)
  const studentName = str(body.studentName, 120) ?? 'Student'

  const block = await checkGrading(user.id)
  if (block) return planBlockResponse(block)

  // Stream newline-delimited JSON so the class page can show each paper's
  // progress: {type:'status'|'progress'|'done'|'error', ...}.
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      try {
        const markSchemeBody = (body.markScheme ?? {}) as { texts?: unknown; images?: unknown }
        send({ type: 'status', message: 'Loading pages' })
        const [markImages, pageImages] = await Promise.all([
          fetchUploadedImageBuffers(markSchemeBody.images, MAX_PAGES),
          fetchUploadedImageBuffers(body.pages, MAX_PAGES),
        ])
        const student = [...toFiles(pageImages), ...textFiles(body.texts)]
        if (!student.length) throw new Error('This paper has no pages')

        // Before the first marks appear Claude is reading the pages and thinking.
        send({ type: 'status', message: `Reading ${student.length} page${student.length === 1 ? '' : 's'}` })
        let content = ''
        let last = ''
        let countedAt = 0
        const graded = await gradePaper({
          markScheme: [...textFiles(markSchemeBody.texts), ...toFiles(markImages)],
          student,
          additionalComments: str(body.additionalComments, 4000) ?? undefined,
          onChunk: (text) => {
            content += text
            const now = Date.now()
            if (now - countedAt < 400) return // re-count a couple of times a second, not per token
            countedAt = now
            const p = markingProgress(content)
            const key = `${p.graded}/${p.total}`
            if (key !== last) { last = key; send({ type: 'progress', ...p }) }
          },
          onProgress: (message) => send({ type: 'status', message: message.replace(/\.+$/, '') }),
        })

        send({ type: 'status', message: 'Saving' })
        const { data: saved, error: saveError } = await createAdminClient()
          .from('grading_results')
          .insert({
            user_id: user.id,
            batch_id: batchId,
            student_name: studentName,
            student_exam_filename: (Array.isArray(body.pages) ? body.pages.length : 0) + ' page(s)',
            total_marks: graded.totalMarks,
            total_possible_marks: graded.totalPossible,
            percentage: graded.percentage,
            grade: graded.grade,
            content: graded.content,
            grade_breakdown: graded.breakdown,
            additional_comments: str(body.additionalComments, 4000),
            class_name: str(body.className, 120),
            class_period: str(body.classPeriod, 40),
            exam_title: str(body.examTitle, 200),
            token_usage: graded.usage ? { ...graded.usage, model: GRADING_MODEL, pages: student.length } : null,
          })
          .select('id')
          .single()
        if (saveError) throw new Error(`Could not save: ${saveError.message}`)

        send({
          type: 'done',
          id: saved.id,
          totalMarks: graded.totalMarks,
          totalPossible: graded.totalPossible,
          percentage: graded.percentage,
          grade: graded.grade,
        })
      } catch (e) {
        console.error(`Batch grading failed for ${studentName}:`, e)
        send({ type: 'error', error: e instanceof Error ? e.message : 'Grading failed' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
}

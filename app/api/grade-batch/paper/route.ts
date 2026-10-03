import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { checkGrading, planBlockResponse } from '@/lib/plans'
import { gradePaper, type PaperFile } from '@/lib/grading/grade-paper'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'
import { createAdminClient } from '@/lib/supabase-server'

// Batch grading, step 2: grade one student's paper (pages already uploaded to
// Cloudinary) against the batch's mark scheme, save it with the batch id, and
// return the score. The browser runs a few of these at a time.

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

  try {
    const markSchemeBody = (body.markScheme ?? {}) as { texts?: unknown; images?: unknown }
    const [markImages, pageImages] = await Promise.all([
      fetchUploadedImageBuffers(markSchemeBody.images, MAX_PAGES),
      fetchUploadedImageBuffers(body.pages, MAX_PAGES),
    ])
    const student = [...toFiles(pageImages), ...textFiles(body.texts)]
    if (!student.length) return NextResponse.json({ error: 'This paper has no pages' }, { status: 400 })

    const graded = await gradePaper({
      markScheme: [...textFiles(markSchemeBody.texts), ...toFiles(markImages)],
      student,
      additionalComments: str(body.additionalComments, 4000) ?? undefined,
    })

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
        token_usage: graded.usage ? { ...graded.usage, model: 'claude-sonnet-5', pages: student.length } : null,
      })
      .select('id')
      .single()
    if (saveError) throw new Error(`Could not save: ${saveError.message}`)

    return NextResponse.json({
      id: saved.id,
      totalMarks: graded.totalMarks,
      totalPossible: graded.totalPossible,
      percentage: graded.percentage,
      grade: graded.grade,
    })
  } catch (e) {
    console.error(`Batch grading failed for ${studentName}:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Grading failed' }, { status: 500 })
  }
}

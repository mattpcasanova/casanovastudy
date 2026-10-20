import { NextRequest, NextResponse } from 'next/server'
import { GRADING_MODEL } from '@/lib/claude-api'
import { requireTeacher } from '@/lib/api-auth'
import { checkGrading, planBlockResponse } from '@/lib/plans'
import { gradePaper, markingProgress, type PaperFile } from '@/lib/grading/grade-paper'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'
import { createAdminClient } from '@/lib/supabase-server'
import { gradingChoices, settingsFromRow } from '@/lib/grading/report-settings'
import { matchRoster, parseName } from '@/lib/grading/names'
import { groupMembersFrom } from '@/lib/grading/group'
import { randomUUID } from 'crypto'
import { loadRoster, ownedClass } from '@/lib/classes/server'

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

  const { data: settingsRow } = await createAdminClient().from('teacher_report_settings').select('*').eq('user_id', user.id).maybeSingle()
  const { scale, markingStyle } = gradingChoices(settingsFromRow(settingsRow), body.gradeScale, body.markingStyle)
  const nameParts = parseName(studentName)

  // Group work: one paper, a report for each member (graded once).
  const members = groupMembersFrom(body.groupMembers, { name: studentName, rosterId: typeof body.rosterId === 'string' ? body.rosterId : null })
  // A class picked for this stack: each member is linked to their roster name
  // (the one the teacher confirmed, else the closest confident match).
  let classId: string | null = null
  const links: Array<Record<string, unknown>> = members.map(() => ({}))
  if (typeof body.classId === 'string' && body.classId) {
    const cls = await ownedClass(createAdminClient(), user.id, body.classId)
    if (cls) {
      classId = cls.id
      const roster = await loadRoster(createAdminClient(), cls.id)
      members.forEach((member, i) => {
        const chosen = roster.find((r) => r.id === member.rosterId)
        const m = chosen ? null : matchRoster(member.name, roster)
        const row = chosen ?? (m?.confidence === 'sure' ? roster.find((r) => r.id === m.rosterId) : undefined)
        member.rosterId = row?.id ?? null
        links[i] = { class_id: cls.id, roster_id: row?.id ?? null, student_user_id: row?.studentUserId ?? null }
      })
    }
  }
  const groupId = members.length > 1 ? randomUUID() : null

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
          scale,
          markingStyle,
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
        const rows = members.map((member, i) => {
          const parts = i === 0 ? nameParts : parseName(member.name)
          return {
            user_id: user.id,
            batch_id: batchId,
            student_name: member.name,
            student_first_name: parts.firstName || null,
            student_last_name: parts.lastName || null,
            grade_scale: scale,
            marking_style: markingStyle,
            ...links[i],
            group_id: groupId,
            group_members: groupId ? members : null,
            released: false,
            student_exam_filename: (Array.isArray(body.pages) ? body.pages.length : 0) + ' page(s)',
            total_marks: graded.totalMarks,
            total_possible_marks: graded.totalPossible,
            percentage: graded.percentage,
            grade: graded.grade,
            content: graded.content,
            grade_breakdown: graded.breakdown,
            ai_breakdown: graded.breakdown, // the AI's marks as graded, kept to measure teacher agreement
            additional_comments: str(body.additionalComments, 4000),
            class_name: str(body.className, 120),
            class_period: str(body.classPeriod, 40),
            exam_title: str(body.examTitle, 200),
            // The paper was graded once: its cost sits on the first member's row.
            token_usage: i === 0 && graded.usage ? { ...graded.usage, model: GRADING_MODEL, pages: student.length } : null,
          }
        })
        const { data: savedRows, error: saveError } = await createAdminClient().from('grading_results').insert(rows).select('id')
        if (saveError || !savedRows?.length) throw new Error(`Could not save: ${saveError?.message ?? 'no rows'}`)
        const saved = savedRows[0]
        await rememberBatchSetup(user.id, batchId, body).catch((e) => console.error('Batch setup not saved:', e))
        // A student marked absent/missing who now has a paper: it came in late.
        const rosterIds = members.map((m) => m.rosterId).filter((r): r is string => !!r)
        if (classId && rosterIds.length) {
          await createAdminClient().from('batch_student_status').update({ status: 'late', updated_at: new Date().toISOString() })
            .eq('batch_id', batchId).in('roster_id', rosterIds).eq('user_id', user.id).in('status', ['absent', 'missing'])
        }

        send({
          type: 'done',
          id: saved.id,
          members: members.length,
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

/**
 * Keep the set's mark scheme (or checked answer key), notes and Classroom
 * assignment, so papers added later are marked the same way. Never touches
 * another teacher's set.
 */
async function rememberBatchSetup(userId: string, batchId: string, body: Record<string, unknown>) {
  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('grading_batches').select('user_id').eq('batch_id', batchId).maybeSingle()
  if (existing && existing.user_id !== userId) return
  const scheme = (body.markScheme ?? {}) as { texts?: unknown; images?: unknown }
  const texts = (Array.isArray(scheme.texts) ? scheme.texts : [])
    .filter((t): t is { name: string; content: string } => !!t && typeof t.name === 'string' && typeof t.content === 'string')
    .slice(0, 20).map((t) => ({ name: t.name.slice(0, 200), content: t.content.slice(0, 200_000) }))
  const images = (Array.isArray(scheme.images) ? scheme.images : [])
    .filter((i): i is { url: string; name?: string } => !!i && typeof i.url === 'string')
    .slice(0, 40).map((i) => ({ url: i.url.slice(0, 500), name: String(i.name ?? '').slice(0, 200) }))
  const row: Record<string, unknown> = {
    batch_id: batchId,
    user_id: userId,
    mark_scheme: texts.length || images.length ? { texts, images } : null,
    notes: typeof body.additionalComments === 'string' && body.additionalComments.trim() ? body.additionalComments.trim().slice(0, 4000) : null,
    updated_at: new Date().toISOString(),
  }
  const classroom = body.classroom as { courseId?: unknown; workId?: unknown } | undefined
  if (classroom && typeof classroom.courseId === 'string' && typeof classroom.workId === 'string' && /^[\w-]{1,40}$/.test(classroom.courseId) && /^[\w-]{1,40}$/.test(classroom.workId)) {
    row.classroom_course_id = classroom.courseId
    row.classroom_work_id = classroom.workId
  }
  await supabase.from('grading_batches').upsert(row, { onConflict: 'batch_id' })
}

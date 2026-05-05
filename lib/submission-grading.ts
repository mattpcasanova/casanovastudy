import { createAdminClient } from './supabase-server'
import { runGradingPipeline } from './grade-exam-pipeline'

interface FileMeta {
  url: string
  name?: string
  type?: string
}

// Map file extensions to MIME types so we infer the correct Content-Type even
// when Cloudinary returns application/octet-stream.
const EXT_MIMES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

async function fetchAsBuffer(
  url: string,
  fallbackName: string
): Promise<{ buffer: Buffer; name: string; type: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const ab = await res.arrayBuffer()

  // Prefer the URL filename for extension-based MIME inference because
  // Cloudinary serves everything as application/octet-stream.
  const urlFilename = url.split('/').pop()?.split('?')[0]
  const name = urlFilename || fallbackName || 'file'
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  const type = EXT_MIMES[ext] ?? res.headers.get('content-type') ?? 'application/octet-stream'

  return { buffer: Buffer.from(ab), name, type }
}

/**
 * Grades a submission using the shared grading pipeline — the same logic path
 * the teacher's manual grade-exam page uses, with no internal HTTP hop.
 *
 * After grading, enriches the grading_results row with real student and class
 * metadata so the teacher's My Reports page shows meaningful info.
 *
 * Throws on any failure; caller should mark the submission as 'failed'.
 */
export async function gradeSubmission(submissionId: string): Promise<{ gradingResultId: string }> {
  const supabase = createAdminClient()

  const { data: submission, error: subError } = await supabase
    .from('assignment_submissions')
    .select('id, assignment_id, student_id, class_id, file_urls')
    .eq('id', submissionId)
    .single()

  if (subError || !submission) throw new Error('Submission not found')

  const { data: assignment, error: aErr } = await supabase
    .from('assignments')
    .select('id, teacher_id, title, mark_scheme_url, grading_instructions')
    .eq('id', submission.assignment_id)
    .single()

  if (aErr || !assignment) throw new Error('Assignment not found')
  if (!assignment.mark_scheme_url) {
    throw new Error('Assignment has no mark scheme — add one before grading')
  }

  const fileUrls = (submission.file_urls as FileMeta[]) ?? []
  if (fileUrls.length === 0) throw new Error('Submission has no files')

  // Mark as grading so the UI can reflect progress
  await supabase
    .from('assignment_submissions')
    .update({ status: 'grading', grading_error: null })
    .eq('id', submissionId)

  // Fetch all files from Cloudinary into buffers
  const markScheme = await fetchAsBuffer(assignment.mark_scheme_url, 'mark-scheme')

  const studentFiles = await Promise.all(
    fileUrls.map((f, i) => fetchAsBuffer(f.url, f.name ?? `page-${i + 1}`))
  )

  // Run the same pipeline the teacher's manual grade-exam page uses.
  // The teacher is the "user" for this grading session (they own the assignment).
  const result = await runGradingPipeline({
    userId: assignment.teacher_id,
    userType: 'teacher',
    markSchemeFile: markScheme,
    studentFiles,
    additionalComments: assignment.grading_instructions ?? undefined,
  })

  // Fetch student profile and class info to enrich the grading_results row
  const [profileRes, classRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', submission.student_id)
      .maybeSingle(),
    supabase
      .from('classes')
      .select('name, period')
      .eq('id', submission.class_id)
      .maybeSingle(),
  ])

  const profile = profileRes.data
  const cls = classRes.data
  const studentName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
    : null

  // Link the grading result to the submission (both directions) and populate
  // the metadata fields so the teacher's My Reports page shows the right info.
  await Promise.all([
    supabase
      .from('assignment_submissions')
      .update({ status: 'pending_review', grading_result_id: result.id, grading_error: null })
      .eq('id', submissionId),
    supabase
      .from('grading_results')
      .update({
        assignment_submission_id: submissionId,
        student_user_id: submission.student_id,
        student_first_name: profile?.first_name ?? null,
        student_last_name: profile?.last_name ?? null,
        student_name: studentName ?? 'Unknown student',
        class_name: cls?.name ?? null,
        class_period: cls?.period ?? null,
        exam_title: assignment.title,
      })
      .eq('id', result.id),
  ])

  return { gradingResultId: result.id }
}

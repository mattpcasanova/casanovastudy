import { createAdminClient } from './supabase-server'

interface FileMeta {
  url: string
  name?: string
  type?: string
}

// Map file extensions to MIME types so we send the correct Content-Type to
// /api/grade-exam even when Cloudinary returns application/octet-stream.
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

async function fetchAsBlob(url: string, fallbackName: string): Promise<{ blob: Blob; name: string; type: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const ab = await res.arrayBuffer()

  // Prefer the filename from the URL (which carries the extension) over the
  // caller-supplied fallback, so we can infer the correct MIME type.
  const urlFilename = url.split('/').pop()?.split('?')[0]
  const name = urlFilename || fallbackName || 'file'
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  const type = EXT_MIMES[ext] ?? res.headers.get('content-type') ?? 'application/octet-stream'

  return { blob: new Blob([ab], { type }), name, type }
}

/**
 * Grades a submission by calling the existing /api/grade-exam route internally.
 * Reuses the same Claude pipeline + parser + grading_results insertion the
 * teacher's manual /grade-exam page uses.
 *
 * After grading, enriches the grading_results row with the real student name,
 * class info, and exam title so the teacher's My Reports page shows them correctly.
 *
 * Throws on any failure; caller is responsible for marking the submission as
 * 'failed' and storing the grading_error.
 */
export async function gradeSubmission(submissionId: string, baseUrl: string): Promise<{ gradingResultId: string }> {
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

  // Mark as grading so the UI can show progress
  await supabase
    .from('assignment_submissions')
    .update({ status: 'grading', grading_error: null })
    .eq('id', submissionId)

  // Build FormData by fetching each Cloudinary URL into a Blob.
  // /api/grade-exam accepts `userId` as a FormData auth fallback when no cookie
  // is present (see app/api/grade-exam/route.ts), which is our case for an
  // internal server-to-server call.
  const fd = new FormData()
  fd.append('userId', assignment.teacher_id)

  const markScheme = await fetchAsBlob(assignment.mark_scheme_url, 'mark-scheme')
  fd.append('markScheme', markScheme.blob, markScheme.name)

  for (let i = 0; i < fileUrls.length; i++) {
    const f = fileUrls[i]
    const fetched = await fetchAsBlob(f.url, f.name ?? `page-${i + 1}`)
    fd.append('studentExam', fetched.blob, fetched.name)
  }

  if (assignment.grading_instructions) {
    fd.append('additionalComments', assignment.grading_instructions)
  }

  const res = await fetch(`${baseUrl}/api/grade-exam`, { method: 'POST', body: fd })
  const json = await res.json()

  // /api/grade-exam returns { success, data: { id, ... }, message }
  if (!res.ok || !json?.success || !json?.data?.id) {
    throw new Error(json?.error ?? `Grading failed (${res.status})`)
  }

  const gradingResultId: string = json.data.id

  // Fetch student profile and class to enrich the grading_results row so
  // the teacher's My Reports page shows the real student name, class, etc.
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

  // Link the grading_result back to the submission (both directions) and
  // populate the metadata fields that were left as placeholders.
  await Promise.all([
    supabase
      .from('assignment_submissions')
      .update({ status: 'pending_review', grading_result_id: gradingResultId, grading_error: null })
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
      .eq('id', gradingResultId),
  ])

  return { gradingResultId }
}

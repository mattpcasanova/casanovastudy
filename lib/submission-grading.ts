import { createAdminClient } from './supabase-server'

interface FileMeta {
  url: string
  name?: string
  type?: string
}

async function fetchAsBlob(url: string, fallbackName: string): Promise<{ blob: Blob; name: string; type: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const ab = await res.arrayBuffer()
  const type = res.headers.get('content-type') ?? 'application/octet-stream'
  const name = fallbackName || url.split('/').pop()?.split('?')[0] || 'file'
  return { blob: new Blob([ab], { type }), name, type }
}

/**
 * Grades a submission by calling the existing /api/grade-exam route internally.
 * Reuses the same Claude pipeline + parser + grading_results insertion the
 * teacher's manual /grade-exam page uses.
 *
 * Throws on any failure; caller is responsible for marking the submission as
 * 'failed' and storing the grading_error.
 */
export async function gradeSubmission(submissionId: string, baseUrl: string): Promise<{ gradingResultId: string }> {
  const supabase = createAdminClient()

  const { data: submission, error: subError } = await supabase
    .from('assignment_submissions')
    .select('id, assignment_id, student_id, file_urls')
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
  // is present (see app/api/grade-exam/route.ts:41), which is exactly our case
  // for an internal server-to-server call.
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
  if (!res.ok || !json?.success || !json?.id) {
    throw new Error(json?.error ?? `Grading failed (${res.status})`)
  }

  // Link the grading_result back to the submission, both directions
  await Promise.all([
    supabase
      .from('assignment_submissions')
      .update({ status: 'pending_review', grading_result_id: json.id, grading_error: null })
      .eq('id', submissionId),
    supabase
      .from('grading_results')
      .update({ assignment_submission_id: submissionId })
      .eq('id', json.id),
  ])

  return { gradingResultId: json.id }
}

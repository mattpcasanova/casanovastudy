// Shared helpers for "what is pending for this student" so /api/my-classes and
// /api/student/dashboard agree on the definition.

export type SubmissionStatus =
  | 'submitted'
  | 'grading'
  | 'pending_review'
  | 'graded'
  | 'failed'

export function isPendingForStudent(submissionStatus: SubmissionStatus | undefined | null): boolean {
  // No submission, or last attempt failed grading and needs to be redone.
  return !submissionStatus || submissionStatus === 'failed'
}

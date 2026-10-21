// Google Classroom web links (browser-safe, unit-tested). Classroom's own
// alternateLink is the course and coursework ids in base64 (checked against a
// link the API returned), so we can link to an assignment without a token.

const b64 = (s: string) => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s).toString('base64')).replace(/=+$/, '')

/** The assignment's page in Classroom; students land on their own turn-in view. */
export function classroomWorkUrl(courseId: string | null | undefined, workId: string | null | undefined): string | null {
  if (!courseId || !workId || !/^\d+$/.test(courseId) || !/^\d+$/.test(workId)) return null
  return `https://classroom.google.com/c/${b64(courseId)}/a/${b64(workId)}/details`
}

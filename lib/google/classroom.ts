// Google Classroom roster import. Read-only scopes; the token is used once
// to import courses and students. Pure helpers are unit-tested
// (classroom.test.ts); the fetch helpers call the Classroom API.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  // Sending scores: only to assignments this app creates (Classroom's rule).
  'https://www.googleapis.com/auth/classroom.coursework.students',
  // Grading students' uploads: only the files the teacher picks in Google's
  // file picker (not their whole Drive).
  'https://www.googleapis.com/auth/drive.file',
]

export const classroomConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

const stateKey = () => process.env.GOOGLE_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** An in-app path to come back to (never another site). */
export function safeNextPath(next: unknown): string | null {
  return typeof next === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(next) && next.length < 300 ? next : null
}

/**
 * OAuth state: who started the connect and where to come back to, valid 15
 * minutes, signed so the callback can trust it without a session.
 */
export function signState(userId: string, now = Date.now(), next: string | null = null): string {
  const body = JSON.stringify({ u: userId, e: now + 15 * 60 * 1000, n: randomBytes(6).toString('hex'), next: safeNextPath(next) })
  const encoded = Buffer.from(body).toString('base64url')
  const sig = createHmac('sha256', stateKey()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifyState(state: string | null, now = Date.now()): { userId: string; next: string | null } | null {
  if (!state) return null
  const [encoded, sig] = state.split('.')
  if (!encoded || !sig) return null
  const expected = createHmac('sha256', stateKey()).update(encoded).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const body = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as { u?: string; e?: number; next?: string | null }
    if (!body.u || !/^[0-9a-f-]{36}$/i.test(body.u) || !(Number(body.e) > now)) return null
    return { userId: body.u, next: safeNextPath(body.next) }
  } catch {
    return null
  }
}

export function authUrl(opts: { redirectUri: string; state: string; loginHint?: string | null }): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: CLASSROOM_SCOPES.join(' '),
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: opts.state,
  })
  if (opts.loginHint) params.set('login_hint', opts.loginHint)
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export interface ClassroomCourse {
  id: string
  name: string
  section?: string
  room?: string
  courseState?: string
}

export interface ClassroomStudent {
  userId?: string
  profile?: { name?: { givenName?: string; familyName?: string; fullName?: string }; emailAddress?: string }
}

/** "Period 2", "P3", "Block 4A" in a course section → the period; otherwise the section as-is. */
export function periodFromSection(section: string | undefined | null): string | null {
  const s = (section ?? '').trim()
  if (!s) return null
  const m = s.match(/^(?:period|per\.?|pd\.?|p|block|hour)\s*:?\s*([0-9]{1,2}[a-z]?)$/i) ?? s.match(/^([0-9]{1,2}[a-z]?)$/i)
  return (m ? m[1] : s).slice(0, 20)
}

export function studentToRoster(s: ClassroomStudent): { firstName: string; lastName: string; email: string | null } | null {
  const name = s.profile?.name
  let firstName = (name?.givenName ?? '').trim()
  let lastName = (name?.familyName ?? '').trim()
  if (!firstName && !lastName && name?.fullName) {
    const parts = name.fullName.trim().split(/\s+/)
    lastName = parts.length > 1 ? parts.pop()! : ''
    firstName = parts.join(' ')
  }
  if (!firstName && !lastName) return null
  const email = s.profile?.emailAddress?.trim().toLowerCase() || null
  return { firstName: firstName.slice(0, 60), lastName: lastName.slice(0, 60), email }
}

async function getAll<T>(url: string, key: string, token: string): Promise<T[]> {
  const out: T[] = []
  let pageToken = ''
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Google Classroom ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
    const data = (await res.json()) as Record<string, unknown>
    out.push(...((data[key] as T[]) ?? []))
    pageToken = (data.nextPageToken as string) ?? ''
    if (!pageToken) break
  }
  return out
}

export const listCourses = (token: string) =>
  getAll<ClassroomCourse>('https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE', 'courses', token)

export const listStudents = (token: string, courseId: string) =>
  getAll<ClassroomStudent>(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/students`, 'students', token)

export interface Submission {
  id: string
  userId: string
  state?: string
  late?: boolean
  updateTime?: string
  assignmentSubmission?: { attachments?: Array<{ driveFile?: { id?: string; title?: string; thumbnailUrl?: string } }> }
}

export interface CourseWork {
  id: string
  title: string
  state?: string
  workType?: string
  maxPoints?: number
  creationTime?: string
  dueDate?: { year: number; month: number; day: number }
  assignment?: { studentWorkFolder?: { id?: string } }
}

export const listCourseWork = (token: string, courseId: string) =>
  getAll<CourseWork>(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork?courseWorkStates=PUBLISHED&orderBy=updateTime%20desc`, 'courseWork', token)

/** Assignments students upload work to, newest first (questions and materials can't have uploads). */
export function uploadAssignments(work: CourseWork[]): Array<{ id: string; title: string; due: string | null; maxPoints: number | null; folderId: string | null }> {
  return work
    .filter((w) => !w.workType || w.workType === 'ASSIGNMENT')
    .map((w) => ({
      id: w.id,
      title: w.title || 'Untitled assignment',
      due: w.dueDate ? `${w.dueDate.year}-${String(w.dueDate.month).padStart(2, '0')}-${String(w.dueDate.day).padStart(2, '0')}` : null,
      maxPoints: w.maxPoints ?? null,
      folderId: w.assignment?.studentWorkFolder?.id ?? null,
    }))
}

export interface StudentWork {
  userId: string
  firstName: string
  lastName: string
  email: string | null
  /** Turned in (or returned after turning in). */
  turnedIn: boolean
  late: boolean
  files: Array<{ id: string; title: string }>
}

/**
 * Each student's uploads for one assignment, by name. Students who attached
 * files but didn't press Turn in still have their files listed (teachers often
 * grade those too); students with no files have none. Sorted by last name.
 */
export function studentWork(submissions: Submission[], students: ClassroomStudent[]): StudentWork[] {
  const byId = new Map(students.filter((s) => s.userId).map((s) => [s.userId!, s]))
  const out: StudentWork[] = []
  for (const sub of submissions) {
    const person = byId.get(sub.userId)
    const name = person ? studentToRoster(person) : null
    if (!name) continue // a removed student, or no name to grade under
    const files = (sub.assignmentSubmission?.attachments ?? [])
      .map((a) => a.driveFile)
      .filter((f): f is { id: string; title?: string } => !!f?.id)
      .map((f) => ({ id: f.id, title: (f.title ?? 'file').slice(0, 200) }))
    out.push({ userId: sub.userId, ...name, turnedIn: sub.state === 'TURNED_IN' || sub.state === 'RETURNED', late: !!sub.late, files })
  }
  return out.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
}

export const listSubmissions = (token: string, courseId: string, courseWorkId: string) =>
  getAll<Submission>(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions`, 'studentSubmissions', token)

/** Creates the assignment scores will be sent to (Classroom only lets an app grade its own assignments). */
export async function createCourseWork(token: string, courseId: string, title: string, maxPoints: number): Promise<string> {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.slice(0, 3000), workType: 'ASSIGNMENT', state: 'PUBLISHED', maxPoints, description: 'Graded with Casanova Study.' }),
  })
  if (!res.ok) throw new ClassroomError(res.status, await res.text().catch(() => ''))
  return ((await res.json()) as { id: string }).id
}

export async function setGrade(token: string, courseId: string, courseWorkId: string, submissionId: string, grade: number): Promise<void> {
  const url = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions/${encodeURIComponent(submissionId)}?updateMask=draftGrade,assignedGrade`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftGrade: grade, assignedGrade: grade }),
  })
  if (!res.ok) throw new ClassroomError(res.status, await res.text().catch(() => ''))
}

export class ClassroomError extends Error {
  constructor(public status: number, detail: string) { super(`Google Classroom ${status}: ${detail.slice(0, 200)}`) }
}

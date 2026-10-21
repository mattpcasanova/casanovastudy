// End-to-end check of assigned practice (2026-10-19): a teacher assigns a quiz
// to two students, students open the share link, claim their names (student
// ID check), post attempts, and the teacher sees status and best scores.
// Creates throwaway users and deletes them. Dev server on :3000:
//   node scripts/e2e-practice-assignments.mjs
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const BASE = 'http://localhost:3000'

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const REF = new globalThis.URL(URL_).hostname.split('.')[0]

let pass = 0
let fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

const created = { users: [], classId: null, guideId: null }

function cookieHeaderFor(session) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const CHUNK = 3180
  if (value.length <= CHUNK) return `${name}=${value}`
  const parts = []
  for (let i = 0; i * CHUNK < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`)
  return parts.join('; ')
}

async function makeUser(kind, first, last) {
  const email = `e2e-practice-${kind}-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  created.users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: kind, first_name: first, last_name: last, birth_date: kind === 'teacher' ? '1985-03-01' : '2009-05-01' })
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signin, error: signinErr } = await anon.auth.signInWithPassword({ email, password })
  if (signinErr) throw signinErr
  return { id: data.user.id, session: signin.session }
}

const client = (session) => async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, Cookie: cookieHeaderFor(session) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}



async function main() {
  const teacher = await makeUser('teacher', 'E2E', 'Teacher')
  created.teacherId = teacher.id
  // Verified teachers only can connect to students (migration 063).
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const stuA = await makeUser('student', 'Lianna', 'Wysocki')
  const stuB = await makeUser('student', 'Sam', 'Other')
  const t = client(teacher.session)
  const a = client(stuA.session)
  const b = client(stuB.session)

  // A class with three names; Lianna has a student ID, Mya has none, Noah is not assigned.
  const { data: cls } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E Stats', period: '1', enrollment_code: 'E2E' + Math.random().toString(36).slice(2, 5).toUpperCase() }).select('id').single()
  created.classId = cls.id
  const { data: roster } = await admin.from('class_roster').insert([
    { class_id: cls.id, first_name: 'Lianna Christine', last_name: 'Wysocki', student_number: '616137944' },
    { class_id: cls.id, first_name: 'Mya', last_name: 'Adams' },
    { class_id: cls.id, first_name: 'Noah', last_name: 'Zed' },
  ]).select('id, first_name')
  const lianna = roster.find((r) => r.first_name.startsWith('Lianna')), mya = roster.find((r) => r.first_name === 'Mya'), noah = roster.find((r) => r.first_name === 'Noah')
  const { data: guide } = await admin.from('study_guides').insert({ user_id: teacher.id, title: 'Binomial practice', subject: 'mathematics', grade_level: '12th', format: 'quiz', content: '## Q\n', file_count: 0 }).select('id').single()
  created.guideId = guide.id

  let r0 = await t('GET', '/api/classes')
  check('teacher class list loads with a Bearer token (Assign window)', r0.status === 200 && r0.json?.classes?.some((c) => c.id === cls.id), JSON.stringify(r0.json).slice(0, 200))

  console.log('\n== Assign ==')
  let r = await t('POST', '/api/practice-assignments', { guideId: guide.id, classId: cls.id, rosterIds: [lianna.id, mya.id], maxAttempts: 2, dueAt: new Date(Date.now() + 86400000).toISOString() })
  check('teacher assigns to two students', r.status === 200 && r.json?.assignment?.code?.length === 8, JSON.stringify(r.json))
  const asg = r.json.assignment
  r = await a('POST', '/api/practice-assignments', { guideId: guide.id, classId: cls.id, rosterIds: [lianna.id] })
  check('students cannot assign', r.status === 403 || r.status === 401)

  console.log('\n== Student opens the link ==')
  r = await a('GET', `/api/practice/${asg.code}`)
  check('unmatched student gets the name picker (assigned names only)', r.json?.state === 'pick' && r.json.names.length === 2 && !r.json.names.some((n) => n.label.startsWith('Noah')), JSON.stringify(r.json))
  check('picker shows first name + initial and asks Lianna for an ID', r.json.names.some((n) => n.label === 'Lianna W.' && n.needsId) && r.json.names.some((n) => n.label === 'Mya A.' && !n.needsId))
  r = await a('POST', `/api/practice/${asg.code}`, { rosterId: lianna.id, studentId: '123' })
  check('wrong student ID is refused', r.status === 400)
  r = await a('POST', `/api/practice/${asg.code}`, { rosterId: lianna.id, studentId: '0616-137-944' })
  check('right student ID links her', r.status === 200 && r.json?.state === 'ready', JSON.stringify(r.json))
  r = await a('GET', `/api/practice/${asg.code}`)
  check('next time it opens straight away', r.json?.state === 'ready')
  r = await b('POST', `/api/practice/${asg.code}`, { rosterId: lianna.id, studentId: '616137944' })
  check('a taken name cannot be claimed again', r.status === 409)
  r = await b('GET', `/api/practice/${asg.code}`)
  check('the other student only sees the unclaimed name', r.json?.state === 'pick' && r.json.names.length === 1 && r.json.names[0].label === 'Mya A.')

  console.log('\n== Attempts ==')
  r = await a('GET', `/api/practice-assignments/${asg.id}/me`)
  check('student sees due date and 2 attempts left', r.json?.attemptsLeft === 2 && !!r.json?.dueAt && r.json.status === 'not_started', JSON.stringify(r.json))
  r = await a('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 6, total: 10 })
  check('first attempt counts', r.json?.counted === true && r.json.attemptsLeft === 1)
  r = await a('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 9, total: 10 })
  check('second attempt counts, best 90%', r.json?.counted === true && r.json.best?.pct === 90 && r.json.attemptsLeft === 0)
  r = await a('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 10, total: 10 })
  check('third is over the limit and not counted', r.json?.counted === false && r.json.best?.pct === 90)
  r = await b('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 1, total: 1 })
  check('an unlinked student cannot post scores', r.status === 403)
  r = await a('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 11, total: 10 })
  check('impossible scores are refused', r.status === 400)

  r = await a('GET', '/api/practice-assignments/mine')
  check('student sees it under Assigned to you', r.json?.assignments?.length === 1 && r.json.assignments[0].status === 'done' && r.json.assignments[0].best?.pct === 90, JSON.stringify(r.json))
  r = await b('GET', '/api/practice-assignments/mine')
  check('an unlinked student sees nothing', r.status === 200 && r.json.assignments.length === 0)

  console.log('\n== Teacher sees it ==')
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  const rowL = r.json?.students?.find((x) => x.rosterId === lianna.id), rowM = r.json?.students?.find((x) => x.rosterId === mya.id)
  check('Lianna done with best 90% over 2 attempts', rowL?.status === 'done' && rowL.best?.pct === 90 && rowL.attempts === 2 && rowL.linkedVia === 'student_id', JSON.stringify(rowL))
  check('Mya not started', rowM?.status === 'not_started' && !rowM.linked)
  r = await t('GET', `/api/classes/${cls.id}/gradebook`)
  const col = r.json?.tests?.find((x) => x.batchId === asg.id)
  const gbL = r.json?.rows?.find((x) => x.rosterId === lianna.id)
  check('gradebook has a practice column with her best score', col?.kind === 'practice' && gbL?.cells?.[asg.id]?.kind === 'practice' && gbL.cells[asg.id].pct === 90 && gbL.practiceAverage === 90 && gbL.average === null, JSON.stringify({ col, cell: gbL?.cells }))
  r = await t('GET', `/api/practice-assignments/${asg.id}/classroom`)
  check('Classroom status loads (not connected)', r.status === 200 && r.json?.connected === false && r.json?.posted === null, JSON.stringify(r.json))
  r = await t('POST', `/api/practice-assignments/${asg.id}/classroom`, { action: 'post' })
  check('posting without a Classroom connection asks to connect', r.status === 401 && r.json?.reconnect === true)
  r = await a('GET', `/api/practice-assignments/${asg.id}/classroom`)
  check('students cannot use the Classroom route', r.status === 401 || r.status === 403)
  r = await t('GET', `/api/practice-assignments?classId=${cls.id}`)
  check('class list shows the assignment', r.json?.assignments?.length === 1)
  r = await b('GET', `/api/practice-assignments/${asg.id}`)
  check('students cannot open the teacher view', r.status === 401 || r.status === 403)
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { dueAt: new Date(Date.now() - 3600000).toISOString(), addRosterIds: [noah.id] })
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('past due: Mya missing, Noah added', r.json?.students?.find((x) => x.rosterId === mya.id)?.status === 'missing' && r.json.students.some((x) => x.rosterId === noah.id))
  r = await t('GET', `/api/classes/${cls.id}/gradebook`)
  check('past due shows Missing in the gradebook', r.json?.rows?.find((x) => x.rosterId === mya.id)?.cells?.[asg.id]?.status === 'missing')
  console.log('\n== My Class (student side) ==')
  // A graded set: Mya on time, Lianna 3 days later after being marked absent; a second set not released yet.
  const batch1 = crypto.randomUUID(), batch2 = crypto.randomUUID()
  const paper = (batch, rosterId, studentId, at, released, title) => ({ user_id: teacher.id, batch_id: batch, class_id: cls.id, roster_id: rosterId, student_user_id: studentId, student_name: 'x', student_exam_filename: 'e2e', total_marks: 8, total_possible_marks: 10, percentage: 80, grade: 'B', content: 'e2e', grade_breakdown: [], released, exam_title: title, created_at: at })
  const day = 86400000, base = Date.now() - 5 * day
  await admin.from('grading_results').insert([
    paper(batch1, mya.id, null, new Date(base).toISOString(), true, 'E2E Unit test'),
    paper(batch1, lianna.id, stuA.id, new Date(base + 3 * day).toISOString(), true, 'E2E Unit test'),
    paper(batch2, lianna.id, stuA.id, new Date(base).toISOString(), false, 'E2E Hidden test'),
  ])
  await admin.from('batch_student_status').insert({ user_id: teacher.id, batch_id: batch1, roster_id: lianna.id, status: 'late' })
  r = await a('GET', '/api/student/classwork')
  check('student sees their class with the teacher name', r.status === 200 && r.json?.classes?.length === 1 && r.json.classes[0].name === 'E2E Stats' && r.json.classes[0].teacherName === 'E2E Teacher', JSON.stringify(r.json?.classes))
  check('student sees the assigned practice', r.json?.assignments?.length === 1 && r.json.assignments[0].classId === cls.id)
  check('only released reports, with days late', r.json?.reports?.length === 1 && r.json.reports[0].title === 'E2E Unit test' && r.json.reports[0].daysLate === 3, JSON.stringify(r.json?.reports))
  check('no "not turned in" for sets she has a paper in', Array.isArray(r.json?.missingTests) && r.json.missingTests.length === 0, JSON.stringify(r.json?.missingTests))
  const batch3 = crypto.randomUUID()
  await admin.from('grading_results').insert(paper(batch3, mya.id, null, new Date(base).toISOString(), false, 'E2E Missed test'))
  await admin.from('grading_batches').insert({ batch_id: batch3, user_id: teacher.id, classroom_course_id: '871738965408', classroom_work_id: '893532706582' })
  r = await a('GET', '/api/student/classwork')
  check('a graded set with no paper from her shows as not turned in, linked to Classroom', r.json?.missingTests?.length === 1 && r.json.missingTests[0].title === 'E2E Missed test' && r.json.missingTests[0].classroomUrl === 'https://classroom.google.com/c/ODcxNzM4OTY1NDA4/a/ODkzNTMyNzA2NTgy/details', JSON.stringify(r.json?.missingTests))
  await admin.from('batch_student_status').insert({ user_id: teacher.id, batch_id: batch3, roster_id: lianna.id, status: 'exempt' })
  r = await a('GET', '/api/student/classwork')
  check('exempt hides it', r.json?.missingTests?.length === 0)
  r = await b('GET', '/api/student/classwork')
  check('a student in no class sees nothing', r.status === 200 && !r.json.classes.length && !r.json.assignments.length && !r.json.reports.length)
  const late = await admin.from('grading_results').select('id').eq('batch_id', batch1).eq('roster_id', lianna.id).single()
  r = await t('GET', `/api/grade-exam/${late.data.id}`)
  check('the report itself says 3 days late', r.json?.data?.daysLate === 3, JSON.stringify(r.json?.data?.daysLate))
  r = await t('GET', `/api/grade-batch/${batch1}`)
  check('class results show her 3 days late', r.json?.roster?.find((x) => x.rosterId === lianna.id)?.daysLate === 3, JSON.stringify(r.json?.roster))

  r = await t('DELETE', `/api/practice-assignments/${asg.id}`)
  const { count } = await admin.from('practice_attempts').select('id', { count: 'exact', head: true }).eq('assignment_id', asg.id)
  check('delete removes it and its attempts', r.status === 200 && count === 0)
}

async function cleanup() {
  if (created.teacherId) await admin.from('grading_results').delete().eq('user_id', created.teacherId)
  if (created.teacherId) await admin.from('batch_student_status').delete().eq('user_id', created.teacherId)
  if (created.teacherId) await admin.from('grading_batches').delete().eq('user_id', created.teacherId)
  if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
  if (created.guideId) await admin.from('study_guides').delete().eq('id', created.guideId)
  for (const id of created.users) await admin.auth.admin.deleteUser(id)
}

try {
  await main()
} catch (e) {
  fail++
  console.error('Crashed:', e)
} finally {
  await cleanup()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

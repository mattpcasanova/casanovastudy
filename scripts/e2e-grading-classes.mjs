// End-to-end check of grade reports, light classes (rosters) and roster name
// matching against the dev server (2026-10-13). Creates a throwaway teacher,
// student, class and graded batch, drives the real API routes, then deletes
// everything. No AI calls. Run with the dev server on :3000:
//   node scripts/e2e-grading-classes.mjs
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'

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

const created = { users: [], classId: null, batchId: randomUUID(), importedClassIds: [] }

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
  const email = `e2e-grading-${kind}-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  created.users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: kind, first_name: first, last_name: last })
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

const breakdown = (a, b) => [
  { questionNumber: '1', marksAwarded: a, marksPossible: 5, explanation: 'Method fine.' },
  { questionNumber: '2', marksAwarded: b, marksPossible: 5, explanation: 'Check units.' },
]

async function main() {
  const teacher = await makeUser('teacher', 'E2E', 'Teacher')
  const student = await makeUser('student', 'Sean', 'Miller')
  const t = client(teacher.session)
  const s = client(student.session)

  console.log('\n== Report settings ==')
  let r = await t('GET', '/api/grading/report-settings')
  check('defaults load', r.status === 200 && r.json?.settings?.showBranding === true, JSON.stringify(r.json))
  r = await t('PUT', '/api/grading/report-settings', { ...r.json.settings, showBranding: false, schoolName: 'E2E High', defaultScale: { preset: 'a_level', basis: 'marks', bands: [{ grade: 'A*', min: 9 }, { grade: 'A', min: 8 }, { grade: 'B', min: 6 }], below: 'U' } })
  check('saved', r.status === 200 && r.json?.settings?.showBranding === false && r.json?.settings?.schoolName === 'E2E High')
  r = await s('GET', '/api/grading/report-settings')
  check('students cannot read teacher settings', r.status === 403, `got ${r.status}`)

  console.log('\n== Class + roster ==')
  const { data: cls } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E GRADING CLASS (safe to delete)', period: '2', enrollment_code: 'E' + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z2-9]/g, 'X') }).select('id, enrollment_code').single()
  created.classId = cls.id
  r = await t('POST', `/api/classes/${cls.id}/roster`, { text: 'Student Name\n1. Sean Miller\nLee, Mary Ann\nAva Kim\nava kim' })
  check('paste adds 3 names, skips the duplicate', r.json?.added === 3 && r.json?.roster?.length === 3, JSON.stringify(r.json))
  r = await s('GET', `/api/classes/${cls.id}/roster`)
  check('students cannot read the roster', r.status === 403, `got ${r.status}`)

  console.log('\n== Batch attached to the class ==')
  const rows = [['Sean Millr', 9, 1], ['Mary Ann Lee', 4, 4], ['Brandon Okafor', 2, 3]].map(([name, a, b]) => ({
    user_id: teacher.id, batch_id: created.batchId, student_name: name, student_exam_filename: 'e2e', total_marks: a + b, total_possible_marks: 10,
    percentage: (a + b) * 10, grade: 'X', content: 'e2e', grade_breakdown: breakdown(a, b), released: false, exam_title: 'E2E Quiz',
  }))
  const { data: inserted } = await admin.from('grading_results').insert(rows).select('id, student_name')
  const idOf = (name) => inserted.find((x) => x.student_name === name).id
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { classId: cls.id })
  check('2 of 3 papers matched to the roster (misread "Millr" included)', r.json?.matched === 2 && r.json?.total === 3, JSON.stringify(r.json))
  r = await t('GET', `/api/grade-batch/earlier?work=nope&title=${encodeURIComponent('e2e quiz')}`)
  check('an earlier set from the same assignment is found by title', r.json?.set?.batchId === created.batchId && r.json.set.names.length === 3, JSON.stringify(r.json))
  await admin.from('grading_batches').insert({ batch_id: created.batchId, user_id: teacher.id, classroom_course_id: 'c1', classroom_work_id: 'w-e2e' })
  r = await t('GET', '/api/grade-batch/earlier?work=w-e2e&title=other')
  check('...and by the Classroom assignment it came from', r.json?.set?.batchId === created.batchId)
  r = await s('GET', '/api/grade-batch/earlier?title=E2E%20Quiz')
  check('students cannot look up sets', r.status === 403 || r.status === 401)
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { gradeScale: { preset: 'a_level', basis: 'marks', bands: [{ grade: 'A*', min: 9 }, { grade: 'A', min: 8 }, { grade: 'B', min: 6 }], below: 'U' } })
  r = await t('GET', `/api/grade-batch/${created.batchId}`)
  const grades = Object.fromEntries(r.json.results.map((x) => [x.student_name, x.grade]))
  check('Cambridge raw-mark grades applied', grades['Sean Millr'] === 'A*' && grades['Mary Ann Lee'] === 'A' && grades['Brandon Okafor'] === 'U', JSON.stringify(grades))
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { names: [{ id: idOf('Sean Millr'), name: 'Sean Miller' }] })
  const { data: renamed } = await admin.from('grading_results').select('student_first_name, student_last_name, roster_id').eq('id', idOf('Sean Millr')).single()
  check('rename splits first/last and keeps the roster link', renamed.student_first_name === 'Sean' && renamed.student_last_name === 'Miller' && !!renamed.roster_id, JSON.stringify(renamed))

  console.log('\n== Teacher verification ==')
  r = await t('GET', '/api/teacher/verification')
  check('a new teacher starts unverified', r.status === 200 && r.json.status === 'none', JSON.stringify(r.json))
  r = await s('POST', '/api/classes/join', { code: cls.enrollment_code })
  check("students can't join an unverified teacher's class", r.status === 403, `got ${r.status} ${JSON.stringify(r.json)}`)
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  r = await t('GET', '/api/teacher/verification')
  check('approved shows as approved', r.json.status === 'approved', JSON.stringify(r.json))

  console.log('\n== Student joins with the code ==')
  r = await s('POST', '/api/classes/join', { code: cls.enrollment_code })
  check('joined', r.status === 201, `got ${r.status} ${JSON.stringify(r.json)}`)
  r = await t('GET', `/api/classes/${cls.id}/roster`)
  const sean = r.json.roster.find((x) => x.firstName === 'Sean')
  check('linked to the existing roster name (no duplicate row)', r.json.roster.length === 3 && sean?.linked === true, JSON.stringify(r.json.roster))
  const { data: paper } = await admin.from('grading_results').select('student_user_id').eq('id', idOf('Sean Millr')).single()
  check('earlier graded paper now belongs to the student', paper.student_user_id === student.id)

  console.log('\n== Release ==')
  r = await s('GET', `/api/grade-exam/${idOf('Sean Millr')}`)
  check('unreleased report is hidden from the student', r.status === 404, `got ${r.status}`)
  r = await s('GET', `/api/grade-exam/${idOf('Mary Ann Lee')}`)
  check("another student's report is hidden", r.status === 404, `got ${r.status}`)
  await t('PATCH', `/api/grade-batch/${created.batchId}`, { released: true })
  r = await s('GET', `/api/grade-exam/${idOf('Sean Millr')}`)
  check('released report is visible to the student', r.status === 200 && r.json?.data?.isOwner === false, `got ${r.status}`)
  check('report carries the teacher settings', r.json?.data?.reportSettings?.showBranding === false && r.json?.data?.reportSettings?.schoolName === 'E2E High')
  const anonRes = await fetch(`${BASE}/api/grade-exam/${idOf('Sean Millr')}`)
  check('signed-out readers get nothing', anonRes.status === 404, `got ${anonRes.status}`)

  console.log('\n== Report edits ==')
  const id = idOf('Mary Ann Lee')
  r = await t('PATCH', `/api/grade-exam/${id}`, {
    gradeBreakdown: [{ questionNumber: '1', marksAwarded: 4.5, marksPossible: 5, explanation: 'ok', markCodes: 'M1 A1', ao: { ao1: 2 } }, { questionNumber: '2', marksAwarded: 5, marksPossible: 5, explanation: 'ok' }],
    studentFirstName: 'Mary Ann', studentLastName: 'Lee', teacherComment: 'Great work', gradeScale: { preset: 'us', basis: 'percent', bands: [{ grade: 'A', min: 90 }], below: 'F' },
  })
  check('half marks total and the new scale', r.json?.data?.totalMarks === 9.5 && r.json?.data?.grade === 'A', JSON.stringify(r.json))
  r = await t('PATCH', `/api/grade-exam/${id}`, { gradeBreakdown: [{ questionNumber: '1', marksAwarded: 6, marksPossible: 5, explanation: '' }] })
  check('marks above the maximum are rejected', r.status === 400)
  r = await s('PATCH', `/api/grade-exam/${id}`, { teacherComment: 'hacked' })
  check('students cannot edit reports', r.status === 403, `got ${r.status}`)
  r = await t('GET', `/api/grade-exam/${id}`)
  check('edits saved', r.json?.data?.teacherComment === 'Great work' && r.json?.data?.gradeBreakdown?.[0]?.ao?.AO1 === 2 && r.json?.data?.totalMarks === 9.5, JSON.stringify(r.json?.data?.gradeBreakdown?.[0]))

  console.log('\n== No-paper statuses ==')
  r = await t('GET', `/api/grade-batch/${created.batchId}`)
  const ava = r.json?.roster?.find((x) => x.name === 'Ava Kim')
  check('roster students without a paper are listed', !!ava && ava.hasPaper === false && r.json.roster.filter((x) => !x.hasPaper).length === 1, JSON.stringify(r.json?.roster))
  await t('PATCH', `/api/grade-batch/${created.batchId}`, { statuses: [{ rosterId: ava.rosterId, status: 'absent' }] })
  r = await t('GET', `/api/grade-batch/${created.batchId}`)
  check('status saved', r.json.roster.find((x) => x.rosterId === ava.rosterId)?.status === 'absent')
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { statuses: [{ rosterId: ava.rosterId, status: 'banana' }] })
  r = await t('GET', `/api/grade-batch/${created.batchId}`)
  check('bad statuses are ignored', r.json.roster.find((x) => x.rosterId === ava.rosterId)?.status === 'absent')

  console.log('\n== Import every class from one file ==')
  r = await t('POST', '/api/classes/import', { text: 'Student ID,Last Name,First Name,Course,Period\n9001,Stone,Ella,E2E IMPORT Stats,1\n9002,Ray,Omar,E2E IMPORT Stats,1\n9003,Fox,Lia,E2E IMPORT Stats,5' })
  check('two classes created by period', r.status === 200 && r.json?.classes?.length === 2 && r.json.classes.every((c) => c.created), JSON.stringify(r.json))
  created.importedClassIds = (r.json?.classes ?? []).map((c) => c.id)
  r = await t('POST', '/api/classes/import', { text: 'Student ID,Last Name,First Name,Course,Period\n9001,Stone,Ella,E2E IMPORT Stats,1\n9004,Diaz,Noa,E2E IMPORT Stats,1' })
  check('re-import adds only new names to the existing class', r.json?.classes?.length === 1 && r.json.classes[0].created === false && r.json.classes[0].added === 1 && r.json.classes[0].skipped === 1, JSON.stringify(r.json))
  r = await t('GET', `/api/classes/${created.importedClassIds[0]}/roster`)
  check('student numbers stored', r.json?.roster?.some((x) => x.studentNumber === '9001'), JSON.stringify(r.json?.roster))

  console.log('\n== Scanner inbox (storage + signed links; email delivery needs Resend) ==')
  const scanPath = `${teacher.id}/e2e-${Date.now()}/1-stack.pdf`
  const pdfBytes = Buffer.from('%PDF-1.4\n%e2e\n')
  const up = await admin.storage.from('scan-inbox').upload(scanPath, pdfBytes, { contentType: 'application/pdf' })
  check('bucket accepts a scan', !up.error, up.error?.message)
  const { data: item } = await admin.from('scan_inbox_items').insert({ user_id: teacher.id, email_id: `e2e-${Date.now()}`, from_address: 'copier@school.org', files: [{ name: 'stack.pdf', path: scanPath, size: pdfBytes.length, contentType: 'application/pdf' }] }).select('id').single()
  r = await t('GET', '/api/scan-inbox')
  check('inbox lists the scan', r.status === 200 && r.json?.items?.some((x) => x.id === item.id && x.files[0].name === 'stack.pdf'), JSON.stringify(r.json))
  r = await s('GET', `/api/scan-inbox/${item.id}`)
  check("students can't open a teacher's scan", r.status === 403, `got ${r.status}`)
  r = await t('GET', `/api/scan-inbox/${item.id}`)
  const dl = r.json?.files?.[0]?.url ? await fetch(r.json.files[0].url) : null
  check('signed link downloads the file', dl?.ok && (await dl.text()).startsWith('%PDF'), JSON.stringify(r.json))
  r = await t('DELETE', `/api/scan-inbox/${item.id}`)
  const gone = await admin.storage.from('scan-inbox').list(scanPath.split('/').slice(0, 2).join('/'))
  check('delete removes the file and the row', r.status === 200 && (gone.data ?? []).length === 0)
  const hook = await fetch(`${BASE}/api/inbound/scan`, { method: 'POST', body: '{}', headers: { 'svix-id': 'x', 'svix-timestamp': '1', 'svix-signature': 'v1,x' } })
  check('webhook refuses unsigned or unconfigured requests', hook.status === 401 || hook.status === 503, `got ${hook.status}`)

  console.log('\n== Student page ==')
  r = await t('GET', `/api/classes/${cls.id}/roster`)
  const seanRow = r.json.roster.find((x) => x.firstName === 'Sean')
  const maryRow = r.json.roster.find((x) => x.firstName === 'Mary Ann')
  r = await t('GET', `/api/classes/${cls.id}/students/${seanRow.id}`)
  check('a joined student shows graded work and practice on your material', r.status === 200 && r.json.student.joined === true && r.json.work.some((w) => w.kind === 'paper') && r.json.practice !== null, JSON.stringify(r.json?.student))
  r = await t('GET', `/api/classes/${cls.id}/students/${maryRow.id}`)
  check('a student who has not joined: graded work only, practice stays private', r.status === 200 && r.json.student.joined === false && r.json.practice === null)
  r = await s('GET', `/api/classes/${cls.id}/students/${seanRow.id}`)
  check("students can't open the teacher's student page", r.status === 403, `got ${r.status}`)
  r = await t('PATCH', `/api/classes/${cls.id}/roster/${maryRow.id}`, { email: 'not-an-email' })
  check('bad emails are refused', r.status === 400)
  r = await t('PATCH', `/api/classes/${cls.id}/roster/${maryRow.id}`, { email: 'Mary.Lee@School.org', studentNumber: '777' })
  r = await t('GET', `/api/classes/${cls.id}/roster`)
  const maryNow = r.json.roster.find((x) => x.id === maryRow.id)
  check('email and student ID can be edited', maryNow.email === 'mary.lee@school.org' && maryNow.studentNumber === '777', JSON.stringify(maryNow))

  console.log('\n== Name-stamped tests ==')
  r = await t('POST', '/api/stamped-tests', { title: 'E2E Unit test', pages: 4, classIds: [cls.id] })
  const copies = r.json?.classes?.[0]?.copies ?? []
  check('one copy per roster name', r.status === 200 && copies.length === 3 && copies.every((c) => /^[A-Z2-9]{8}$/.test(c.code)), JSON.stringify(r.json))
  created.stampedTestId = r.json?.testId
  r = await t('POST', '/api/stamped-tests/resolve', { codes: [copies[0]?.code, 'ZZZZZZZZ', 'not-a-code'] })
  check('codes resolve to the student, class and page count', r.json?.copies?.length === 1 && r.json.copies[0].name === copies[0].name && r.json.copies[0].pages === 4 && r.json.copies[0].classId === cls.id && !!r.json.copies[0].rosterId, JSON.stringify(r.json))
  r = await s('POST', '/api/stamped-tests/resolve', { codes: [copies[0]?.code] })
  check("other accounts can't resolve a teacher's codes", r.status === 403, `got ${r.status}`)

  console.log('\n== Google Classroom (email linking; OAuth needs real Google credentials) ==')
  r = await t('GET', '/api/google/classroom')
  check('status answers', r.status === 200 && typeof r.json?.configured === 'boolean', JSON.stringify(r.json))
  const { data: studentProfile } = await admin.from('user_profiles').select('email').eq('id', student.id).single()
  const { data: gc } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E CLASSROOM (safe to delete)', enrollment_code: 'G' + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z2-9]/g, 'Y'), google_course_id: 'e2e-course' }).select('id').single()
  created.importedClassIds.push(gc.id)
  await admin.from('class_roster').insert({ class_id: gc.id, first_name: 'Sean', last_name: 'Miller', email: studentProfile.email })
  r = await t('GET', `/api/classes/${gc.id}/roster`)
  check('a roster email matching an account links it with no join code', r.json?.roster?.[0]?.linked === true && r.json.roster[0].studentUserId === student.id, JSON.stringify(r.json?.roster))
  r = await t('GET', '/api/google/classroom/courses')
  check('courses need a fresh Google connection', r.status === 401 && r.json?.reconnect === true, `got ${r.status}`)

  console.log('\n== School years, students who left, gradebook, courses ==')
  r = await t('GET', `/api/classes/${cls.id}/roster`)
  check('new classes get the current school year', /^\d{4}-\d{2}$/.test(r.json?.class?.school_year ?? ''), JSON.stringify(r.json?.class))
  const thisYear = r.json.class.school_year
  const avaRow = r.json.roster.find((x) => x.firstName === 'Ava')
  await t('PATCH', `/api/classes/${cls.id}/roster/${avaRow.id}`, { left: true })
  r = await t('GET', `/api/classes/${cls.id}/roster`)
  check('a student can be marked as left', r.json.roster.find((x) => x.id === avaRow.id)?.left === true)
  r = await t('GET', `/api/classes/${cls.id}/gradebook`)
  check('gradebook: one test column, a row per student with averages', r.json?.tests?.length === 1 && r.json.rows.length >= 3 && r.json.rows.some((x) => x.left), JSON.stringify(r.json?.tests))
  r = await t('POST', '/api/classes/roll-over', { classIds: [cls.id] })
  const nextYear = r.json?.toYear
  check('Start next year copies the class with no students', r.status === 200 && r.json.created.length === 1 && nextYear > thisYear, JSON.stringify(r.json))
  if (r.json?.created?.[0]) created.importedClassIds.push(r.json.created[0].id)
  r = await t('GET', `/api/classes/${r.json.created[0].id}/roster`)
  check('the copy is empty and in next year', r.json?.roster?.length === 0 && r.json.class.school_year === nextYear)
  r = await t('POST', '/api/classes/roll-over', { classIds: [cls.id] })
  check('rolling over twice does not duplicate', r.json?.created?.length === 0 && r.json.skipped === 1, JSON.stringify(r.json))
  r = await t('GET', '/api/courses')
  const course = r.json?.courses?.find((c) => c.name.startsWith('E2E GRADING CLASS'))
  check('courses link years', course?.years?.length === 2, JSON.stringify(r.json?.courses))
  r = await t('GET', `/api/courses?key=${encodeURIComponent(course.key)}`)
  check('course view lists both years', r.json?.years?.length === 2 && r.json.years.some((y) => y.year === thisYear), JSON.stringify(r.json))
  created.courseKey = course.key
  created.thisYear = thisYear
  r = await t('POST', '/api/google/classroom/grades', { batchId: created.batchId })
  check('sending to Classroom needs a Google connection first', r.status === 401 && r.json?.reconnect === true, `got ${r.status}`)

  console.log('\n== Class summary ==')
  r = await t('GET', `/api/classes/${cls.id}/summary`)
  check('graded set listed and released', r.json?.batches?.length === 1 && r.json.batches[0].papers === 3 && r.json.batches[0].released === true, JSON.stringify(r.json))
  check('one linked student', r.json?.linkedStudents === 1)
  check('no areas before a class report exists', r.json?.areas?.length === 0 && r.json?.setsWithoutReport === 1, JSON.stringify(r.json?.areas))
  await admin.from('grading_batch_insights').insert({ batch_id: created.batchId, user_id: teacher.id, signature: 'e2e', data: { summary: 'x', topics: [{ name: 'Method', questions: ['1'] }, { name: 'Units', questions: ['2'] }], struggles: [], reteach: [] } })
  r = await t('GET', `/api/classes/${cls.id}/summary`)
  const units = r.json?.areas?.find((a) => a.name === 'Units')
  r = await t('GET', `/api/courses?key=${encodeURIComponent(created.courseKey)}`)
  check('course view shows this year\'s areas', r.json?.areas?.length === 2 && r.json.areas.every((a) => a.byYear[created.thisYear]), JSON.stringify(r.json?.areas))
  r = await t('GET', `/api/classes/${cls.id}/summary`)
  check('areas add up per student, weakest first', r.json?.areas?.length === 2 && r.json.areas[0].pct <= r.json.areas[1].pct && units?.students?.length === 3, JSON.stringify(r.json?.areas))
}

async function cleanup() {
  await admin.from('grading_results').delete().eq('batch_id', created.batchId)
  if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
  for (const id of created.importedClassIds) await admin.from('classes').delete().eq('id', id)
  await admin.from('batch_student_status').delete().eq('batch_id', created.batchId)
  await admin.from('grading_batch_insights').delete().eq('batch_id', created.batchId)
  await admin.from('grading_batches').delete().eq('batch_id', created.batchId)
  if (created.stampedTestId) await admin.from('stamped_tests').delete().eq('id', created.stampedTestId)
  for (const id of created.users) {
    await admin.from('teacher_report_settings').delete().eq('user_id', id)
    await admin.auth.admin.deleteUser(id)
  }
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

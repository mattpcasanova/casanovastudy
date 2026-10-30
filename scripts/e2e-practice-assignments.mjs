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
const BASE = process.env.E2E_BASE || 'http://localhost:3000'

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
  return { id: data.user.id, email, session: signin.session }
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
  check('unmatched student gets the name picker with only her own name (not classmates, not unassigned)', r.json?.state === 'pick' && r.json.names.length === 1, JSON.stringify(r.json))
  check('picker shows first name + initial and asks Lianna for an ID', r.json.names?.[0]?.label === 'Lianna W.' && r.json.names[0].needsId)
  r = await a('POST', `/api/practice/${asg.code}`, { rosterId: lianna.id, studentId: '123' })
  check('wrong student ID is refused', r.status === 400)
  r = await a('POST', `/api/practice/${asg.code}`, { rosterId: lianna.id, studentId: '0616-137-944' })
  check('right student ID links her', r.status === 200 && r.json?.state === 'ready', JSON.stringify(r.json))
  r = await a('GET', `/api/practice/${asg.code}`)
  check('next time it opens straight away', r.json?.state === 'ready')
  r = await b('POST', `/api/practice/${asg.code}`, { rosterId: lianna.id, studentId: '616137944' })
  check('a taken name cannot be claimed again', r.status === 409)
  r = await b('GET', `/api/practice/${asg.code}`)
  check('a student whose name is not on the list gets no names to pick', r.json?.state === 'no_match' && !r.json.names && r.json.accountName === 'Sam Other', JSON.stringify(r.json))
  r = await b('POST', `/api/practice/${asg.code}`, { rosterId: mya.id })
  check('and cannot claim a name that is not theirs', r.status === 409, JSON.stringify(r.json))
  const stuM = await makeUser('student', 'Mia', 'Adams')
  r = await client(stuM.session)('GET', `/api/practice/${asg.code}`)
  check('a near spelling of their name (Mia for Mya) is offered, and only that one', r.json?.state === 'pick' && r.json.names.length === 1 && r.json.names[0].label === 'Mya A.', JSON.stringify(r.json))

  console.log('\n== Another period\'s link ==')
  // A 5th-period student on the 7th-period link once claimed 7th-period names.
  const stuC = await makeUser('student', 'Cara', 'Period')
  const stuD = await makeUser('student', 'Dev', 'Nobody')
  const c = client(stuC.session), d = client(stuD.session)
  const { data: cls2 } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E Stats', period: '2', enrollment_code: 'E2F' + Math.random().toString(36).slice(2, 5).toUpperCase() }).select('id').single()
  created.classId2 = cls2.id
  const { data: roster2 } = await admin.from('class_roster').insert([
    { class_id: cls2.id, first_name: 'Cara', last_name: 'Period', email: stuC.email },
    { class_id: cls2.id, first_name: 'Ava', last_name: 'Bee', email: `e2e-ava-${Date.now()}@example.com` },
  ]).select('id, first_name')
  r = await t('POST', '/api/practice-assignments', { guideId: guide.id, classId: cls2.id, rosterIds: roster2.map((x) => x.id) })
  const asg2 = r.json?.assignment
  check('same guide assigned to period 2', r.status === 200 && !!asg2?.code, JSON.stringify(r.json))
  r = await c('GET', `/api/practice/${asg.code}`)
  check('period 2 student on the period 1 link is sent to their own link, no names offered', r.json?.state === 'other_class' && r.json.other?.code === asg2.code && !r.json.names, JSON.stringify(r.json))
  r = await c('POST', `/api/practice/${asg.code}`, { rosterId: mya.id })
  check('and cannot claim a period 1 name', r.status === 409, JSON.stringify(r.json))
  r = await d('GET', `/api/practice/${asg2.code}`)
  check('names with another school account\'s email are never offered', r.json?.state === 'not_assigned', JSON.stringify(r.json))
  r = await d('POST', `/api/practice/${asg2.code}`, { rosterId: roster2.find((x) => x.first_name === 'Ava').id })
  check('nor can they be claimed', r.status === 409, JSON.stringify(r.json))
  r = await c('GET', `/api/practice/${asg2.code}`)
  check('their own link links them by email', r.json?.state === 'ready', JSON.stringify(r.json))

  console.log('\n== Teacher spots a wrong link ==')
  // As it was before the picker checked names: Cara (period 2) sitting on Mya's period 1 name, with a run.
  await admin.from('class_roster').update({ student_user_id: stuC.id, linked_via: 'picked' }).eq('id', mya.id)
  const { data: wrongRun } = await admin.from('practice_attempts').insert({ assignment_id: asg.id, roster_id: mya.id, student_user_id: stuC.id, correct: 3, total: 4, pct: 75, counted: true, finished_at: new Date().toISOString() }).select('id').single()
  r = await t('GET', `/api/classes/${cls.id}/roster`)
  const rosterMya = r.json?.roster?.find((x) => x.id === mya.id), rosterLianna = r.json?.roster?.find((x) => x.id === lianna.id)
  check('class list shows who is signed in on a name, flagged when it cannot be them', rosterMya?.account?.name === 'Cara Period' && rosterMya.account.matches === false && rosterLianna?.account?.matches === true, JSON.stringify([rosterMya, rosterLianna]))
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('the practice page flags it too', r.json?.students?.find((x) => x.rosterId === mya.id)?.account?.matches === false)
  r = await t('PATCH', `/api/classes/${cls.id}/roster/${mya.id}`, { unlink: true })
  const { data: movedRun } = await admin.from('practice_attempts').select('assignment_id, roster_id').eq('id', wrongRun.id).maybeSingle()
  const caraRow = roster2.find((x) => x.first_name === 'Cara')
  check('"Not them" unlinks the name and moves the run to her own class', r.status === 200 && movedRun?.assignment_id === asg2.id && movedRun.roster_id === caraRow.id, JSON.stringify(movedRun))
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  const myaAfter = r.json?.students?.find((x) => x.rosterId === mya.id)
  check('Mya is back to not started, with no one on her name', myaAfter && !myaAfter.linked && !myaAfter.best && !myaAfter.account, JSON.stringify(myaAfter))

  console.log('\n== Time limit (2026-10-30) ==')
  r = await a('GET', `/api/practice-assignments/${asg.id}/me`)
  check('no time limit unless the teacher sets one', r.json?.timeLimit === null, JSON.stringify(r.json?.timeLimit))
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { timeLimitSeconds: 1200 })
  r = await a('GET', `/api/practice-assignments/${asg.id}/me`)
  check('student sees the 20-minute limit', r.json?.timeLimit === 1200, JSON.stringify(r.json?.timeLimit))
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { timeLimitSeconds: 5 })
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('a limit under a minute is raised to one minute', r.json?.assignment?.time_limit_seconds === 60, JSON.stringify(r.json?.assignment?.time_limit_seconds))
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { timeLimitSeconds: null })
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('and it can be removed', r.json?.assignment?.time_limit_seconds === null)

  console.log('\n== AI help ==')
  const explain = async (session, prompt, extra = {}) => {
    const res = await fetch(`${BASE}/api/explain`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ studyGuideId: guide.id, turns: [{ role: 'user', content: prompt }], ...extra }) })
    const text = await res.text()
    return { status: res.status, assigned: res.headers.get('X-Assigned-Ai'), text }
  }
  r = await a('GET', `/api/practice-assignments/${asg.id}/me`)
  check('AI help defaults to hints only (tutor)', r.json?.aiHelp === 'tutor', JSON.stringify(r.json))
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { aiHelp: 'off' })
  let ex = await explain(stuA.session, 'What is a binomial distribution?')
  check('AI off: Explain is refused for the assigned student, even without the assignment link', ex.status === 403 && JSON.parse(ex.text).code === 'ai_off', ex.text.slice(0, 200))
  r = await a('GET', `/api/practice-assignments/${asg.id}/me`)
  check('student sees AI help off', r.json?.aiHelp === 'off')
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { aiHelp: 'tutor' })
  ex = await explain(stuA.session, 'Answer these for me: 1) What is 7 x 8? A) 54 B) 56 C) 58 D) 64. 2) What is 9 x 6? A) 45 B) 54 C) 56 D) 63')
  check('tutor: Explain answers, marked as assigned work', ex.status === 200 && ex.assigned === 'tutor' && ex.text.length > 20, ex.text.slice(0, 200))
  check('tutor: the pasted questions are not answered', !/\b56\b|\b54\b|\bB\)/.test(ex.text.replace(/A\) 54 B\) 56|A\) 45 B\) 54 C\) 56/g, '')), ex.text)
  console.log('    reply:', ex.text.replace(/\s+/g, ' ').slice(0, 300))
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  const usesL = r.json?.students?.find((x) => x.rosterId === lianna.id)?.aiUses ?? []
  check('teacher sees what she typed (refused messages are not logged)', usesL.length === 1 && usesL[0].kind === 'typed' && usesL[0].message.startsWith('Answer these for me'), JSON.stringify(usesL))
  const asStudent = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${stuA.session.access_token}` } } })
  const { data: peek } = await asStudent.from('assignment_ai_uses').select('id')
  check('students cannot read the AI log', Array.isArray(peek) && peek.length === 0, JSON.stringify(peek))
  const asTeacher = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${teacher.session.access_token}` } } })
  const { data: tPeek } = await asTeacher.from('assignment_ai_uses').select('id').eq('assignment_id', asg.id)
  check('the teacher can read it for her assignment', tPeek?.length === 1)

  console.log('\n== Opened without the link (2026-10-27) ==')
  r = await a('GET', `/api/practice-assignments/for-guide?guideId=${created.guideId}`)
  check('the guide finds her assignment without ?assignment=', r.json?.assignmentId === asg.id && r.json.guideId === created.guideId, JSON.stringify(r.json))
  r = await a('POST', '/api/study-guides/copy', { studyGuideId: created.guideId })
  check('assigned work is not copied to My Guides', r.status === 409 && r.json?.assigned === true && r.json.studyGuideUrl?.includes(asg.id), JSON.stringify(r.json))
  const { data: oldCopy, error: copyErr } = await admin.from('study_guides').insert({ user_id: stuA.id, title: 'Binomial practice', subject: 'mathematics', grade_level: '12th', format: 'quiz', content: '## Q\n', file_count: 0, copied_from: created.guideId }).select('id').single()
  if (copyErr) throw copyErr
  r = await a('GET', `/api/practice-assignments/for-guide?guideId=${oldCopy.id}`)
  check('a copy saved before points back to the assigned original', r.json?.assignmentId === asg.id && r.json.guideId === created.guideId, JSON.stringify(r.json))
  r = await a('GET', '/api/study-guides/origins')
  check('My Guides says who the copy came from (teacher by full name)', r.json?.origins?.[oldCopy.id] === 'E2E Teacher', JSON.stringify(r.json))
  await admin.from('study_guides').delete().eq('id', oldCopy.id)
  r = await client(stuB.session)('GET', `/api/practice-assignments/for-guide?guideId=${created.guideId}`)
  check('a student not assigned it gets nothing', r.json?.assignmentId === null, JSON.stringify(r.json))
  const asLianna = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${stuA.session.access_token}` } } })
  const savedRun = { run: { mode: 'practice', index: 2, answers: { q1: 'A' }, checked: { q1: true }, hinted: {}, saScores: {}, marked: [], subset: null }, updatedAt: Date.now() }
  const { error: saveErr } = await asLianna.from('study_progress').upsert({ user_id: stuA.id, study_guide_id: created.guideId, kind: 'quiz', data: savedRun }, { onConflict: 'user_id,study_guide_id,kind' })
  const { data: back } = await asLianna.from('study_progress').select('data').eq('study_guide_id', created.guideId).eq('kind', 'quiz').maybeSingle()
  check('a quiz run in progress saves to her account', !saveErr && back?.data?.run?.index === 2, saveErr?.message)
  await admin.from('study_progress').delete().eq('user_id', stuA.id)

  console.log('\n== Attempts ==')
  r = await a('GET', `/api/practice-assignments/${asg.id}/me`)
  check('student sees due date and 2 attempts left', r.json?.attemptsLeft === 2 && !!r.json?.dueAt && r.json.status === 'not_started', JSON.stringify(r.json))
  r = await a('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 6, total: 10 })
  check('first attempt counts', r.json?.counted === true && r.json.attemptsLeft === 1)
  r = await a('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 9, total: 10, seconds: 754 })
  check('second attempt counts, best 90%', r.json?.counted === true && r.json.best?.pct === 90 && r.json.attemptsLeft === 0)
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('the teacher sees how long the best run took', r.json?.students?.find((x) => x.rosterId === lianna.id)?.best?.seconds === 754, JSON.stringify(r.json?.students?.find((x) => x.rosterId === lianna.id)?.best))
  r = await a('POST', `/api/practice-assignments/${asg.id}/attempts`, { correct: 10, total: 10 })
  check('third is over the limit and not counted', r.json?.counted === false && r.json.best?.pct === 90)
  r = await a('GET', `/api/practice-assignments/${asg.id}/me`)
  check('with no attempts left the AI rule no longer applies', r.json?.aiHelp === 'full', JSON.stringify(r.json?.aiHelp))
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

  console.log('\n== Class report + reteach plan ==')
  const QUIZ = `## Mole Conversions\n\nMC_QUESTION: How many moles are in 18 g of water?\nA) 0.5\nB) 1\nC) 2\nD) 18\nCorrect Answer: B\n\nTF_QUESTION: One mole of any gas at STP is 22.4 L.\nCorrect Answer: True\n\n## Limiting Reagent\n\nMC_QUESTION: Which reactant runs out first?\nA) The one with the smaller mass\nB) The one that makes less product\nC) The one with more moles\nD) Neither\nCorrect Answer: B\n\nMC_QUESTION: 2 mol H2 and 2 mol O2 make water. What limits it?\nA) H2\nB) O2\nC) Both\nD) Neither\nCorrect Answer: A\n`
  const { data: quiz } = await admin.from('study_guides').insert({ user_id: teacher.id, title: 'Stoich check', subject: 'chemistry', grade_level: '11th', format: 'quiz', content: QUIZ, file_count: 0 }).select('id').single()
  created.quizId = quiz.id
  r = await t('POST', '/api/practice-assignments', { guideId: quiz.id, classId: cls.id, rosterIds: [lianna.id] })
  const qa = r.json.assignment
  r = await t('GET', `/api/practice-assignments/${qa.id}/report`)
  check('report is empty before anyone finishes', r.status === 200 && r.json.finished === 0 && r.json.results.length === 0, JSON.stringify(r.json).slice(0, 200))
  r = await a('POST', `/api/practice-assignments/${qa.id}/attempts`, { correct: 2, total: 4, detail: { answers: [
    { id: 'q:q-0', correct: false, given: '18' }, { id: 'q:q-1', correct: true, given: 'true' }, { id: 'q:q-2', correct: true, given: 'The one that makes less product' }, { id: 'bad', correct: true },
  ] } })
  check('attempt with answers is saved', r.status === 200 && r.json.counted === true)
  const { data: saved } = await admin.from('practice_attempts').select('detail').eq('assignment_id', qa.id).single()
  check('answers kept, junk dropped', saved.detail?.answers?.length === 3, JSON.stringify(saved.detail))
  r = await t('GET', `/api/practice-assignments/${qa.id}`)
  check('progress view does not carry the answers', !r.json.students[0].best?.detail?.answers, JSON.stringify(r.json.students[0].best))
  r = await t('GET', `/api/practice-assignments/${qa.id}/report`)
  const q1 = r.json?.results?.find((x) => x.question.label === '1'), q4 = r.json?.results?.find((x) => x.question.label === '4')
  check('report: 1 finished, 4 questions, guide topics', r.json.finished === 1 && r.json.results.length === 4 && r.json.topics.length === 2, JSON.stringify(r.json).slice(0, 300))
  check('report groups the wrong answer she gave', q1?.wrong?.[0]?.given === '18' && q1.wrong[0].students[0].rosterId === lianna.id && q1.pct === 0, JSON.stringify(q1))
  check('a question she left blank counts as blank', q4?.skipped?.length === 1, JSON.stringify(q4))
  r = await b('GET', `/api/practice-assignments/${qa.id}/report`)
  check('students cannot read the report', r.status === 401 || r.status === 403)
  r = await t('POST', `/api/practice-assignments/${qa.id}/report`)
  check('AI class report is written, with the guide topics', r.status === 200 && !!r.json.insights?.summary && r.json.insights.topics.map((x) => x.name).join('|') === 'Mole Conversions|Limiting Reagent', JSON.stringify(r.json).slice(0, 400))
  check('the summary never names her', !/Lianna|Wysocki/.test(JSON.stringify(r.json.insights)))
  r = await t('GET', `/api/practice-assignments/${qa.id}/reteach`)
  check('reteach options list both topics', r.json?.ready === true && r.json.topics.length === 2 && r.json.classId === cls.id, JSON.stringify(r.json))
  r = await t('POST', `/api/practice-assignments/${qa.id}/reteach`, { minutes: 30, detail: 'quick' })
  const groupStudents = (r.json?.saved?.groups ?? []).flatMap((g) => g.students)
  check('reteach plan written with her in a group', r.status === 200 && !!r.json.saved?.plan?.title && groupStudents.some((x) => x.rosterId === lianna.id) && r.json.saved.source === 'practice', JSON.stringify(r.json).slice(0, 400))
  r = await t('GET', `/api/practice-assignments/${qa.id}/reteach`)
  check('reteach plan is saved', !!r.json?.saved?.plan)
  r = await t('POST', '/api/practice-assignments', { guideId: quiz.id, classId: cls.id, rosterIds: [lianna.id], source: { practiceId: qa.id, groupKey: 'topic-1' } })
  r = await t('GET', `/api/practice-assignments?practiceId=${qa.id}`)
  check('practice assigned from a group links back to the plan', r.json?.assignments?.length === 1 && r.json.assignments[0].source?.groupKey === 'topic-1', JSON.stringify(r.json?.assignments?.map((x) => x.source)))

  r = await t('DELETE', `/api/practice-assignments/${asg.id}`)
  const { count } = await admin.from('practice_attempts').select('id', { count: 'exact', head: true }).eq('assignment_id', asg.id)
  check('delete removes it and its attempts', r.status === 200 && count === 0)

  console.log('\n== In progress, and unfinished work sent at the due date (2026-10-27) ==')
  const PRACTICE = '## Cells\n\nMATCH: Match each organelle to its job\n- Nucleus = Stores DNA\n- Mitochondria = Makes ATP\n- Ribosome = Builds proteins\n\nFILL: Cellular respiration happens in the {{mitochondria}}.\n\nMC_QUESTION: Which organelle builds proteins?\nA) Nucleus\nB) Ribosome\nCorrect Answer: B\n'
  const { data: pg } = await admin.from('study_guides').insert({ user_id: teacher.id, title: 'Cells practice', subject: 'biology', grade_level: '9th', format: 'practice', content: PRACTICE, file_count: 0 }).select('id').single()
  created.practiceGuideId = pg.id
  r = await t('POST', '/api/practice-assignments', { guideId: pg.id, classId: cls.id, rosterIds: [lianna.id], maxAttempts: 1, dueAt: new Date(Date.now() + 86400000).toISOString() })
  const due = r.json?.assignment
  check('practice assigned with one attempt', !!due?.id, JSON.stringify(r.json))
  // Lianna answers 2 of 3 in class (partial credit on the matching), then leaves.
  const run = { updatedAt: Date.now(), run: { index: 2, results: { 'p-0': { correct: false, score: 0.67, given: '2 of 3 pairs on the first try' }, 'p-1': { correct: true, given: 'mitochondria' } }, later: [], subset: null, streak: 1, bestStreak: 1 } }
  await admin.from('study_progress').upsert({ user_id: stuA.id, study_guide_id: pg.id, kind: 'practice', data: run }, { onConflict: 'user_id,study_guide_id,kind' })
  r = await t('GET', `/api/practice-assignments/${due.id}`)
  let row = r.json?.students?.find((x) => x.rosterId === lianna.id)
  check('teacher sees her in progress, 2 of 3 answered', row?.status === 'not_started' && row.inProgress?.answered === 2 && row.inProgress.total === 3 && !row.incomplete, JSON.stringify(row))
  // The due date passes.
  await admin.from('practice_assignments').update({ due_at: new Date(Date.now() - 3600000).toISOString() }).eq('id', due.id)
  r = await t('GET', `/api/practice-assignments/${due.id}`)
  row = r.json?.students?.find((x) => x.rosterId === lianna.id)
  check('after the due date it was sent: incomplete, 1.67/3', row?.status === 'incomplete' && row.best?.correct === 1.67 && row.best.total === 3 && row.incomplete?.answered === 2 && row.attempts === 0, JSON.stringify(row))
  r = await t('GET', `/api/practice-assignments/${due.id}`)
  const { count: sentCount } = await admin.from('practice_attempts').select('id', { count: 'exact', head: true }).eq('assignment_id', due.id)
  check('sent once, however often the page loads', sentCount === 1)
  r = await t('GET', `/api/classes/${cls.id}/gradebook`)
  const cell = r.json?.rows?.find((x) => x.rosterId === lianna.id)?.cells?.[due.id]
  check('gradebook shows the score, marked incomplete', cell?.kind === 'practice' && Math.round(cell.pct) === 56 && cell.incomplete === true, JSON.stringify(cell))
  r = await a('GET', `/api/practice-assignments/${due.id}/me`)
  check('she sees it was sent, and still has her attempt', r.json?.status === 'incomplete' && r.json.attemptsLeft === 1 && r.json.sentAtDue?.answered === 2, JSON.stringify(r.json))
  r = await a('GET', '/api/student/classwork')
  check('it stays in her to-do list as sent unfinished', r.json?.assignments?.find((x) => x.id === due.id)?.status === 'incomplete')
  r = await a('POST', `/api/practice-assignments/${due.id}/attempts`, { correct: 3, total: 3 })
  check('finishing it afterwards counts', r.json?.counted === true && r.json.best?.pct === 100 && r.json.attemptsLeft === 0, JSON.stringify(r.json))
  r = await t('GET', `/api/practice-assignments/${due.id}`)
  row = r.json?.students?.find((x) => x.rosterId === lianna.id)
  check('teacher now sees it late with the better score', row?.status === 'late' && row.best?.pct === 100 && row.attempts === 1, JSON.stringify(row))
  await admin.from('study_progress').delete().eq('user_id', stuA.id)
}

async function cleanup() {
  if (created.teacherId) await admin.from('grading_results').delete().eq('user_id', created.teacherId)
  if (created.teacherId) await admin.from('batch_student_status').delete().eq('user_id', created.teacherId)
  if (created.teacherId) await admin.from('grading_batches').delete().eq('user_id', created.teacherId)
  if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
  if (created.classId2) await admin.from('classes').delete().eq('id', created.classId2)
  if (created.guideId) await admin.from('study_guides').delete().eq('id', created.guideId)
  if (created.quizId) await admin.from('study_guides').delete().eq('id', created.quizId)
  if (created.practiceGuideId) await admin.from('study_guides').delete().eq('id', created.practiceGuideId)
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

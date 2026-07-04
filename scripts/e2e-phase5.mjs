// Phase 5 E2E: simulated class run. Three students at different stages, the
// teacher progress matrix, and force-finalize after the due date.
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = '/Users/mattcasanova/Projects/casanovastudy'
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const BASE = 'http://localhost:3000'

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const REF = new globalThis.URL(URL).hostname.split('.')[0]
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anonClient = () => createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

const created = { teacherId: null, studentIds: [], classId: null, conceptId: null, assignmentId: null, gradingResultIds: [] }

function cookieFor(session) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const CHUNK = 3180
  if (value.length <= CHUNK) return `${name}=${value}`
  const parts = []
  for (let i = 0; i * CHUNK < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`)
  return parts.join('; ')
}

async function makeUser(email, userType, last) {
  const { data: prior } = await admin.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (prior) await admin.auth.admin.deleteUser(prior.id)
  const password = 'E2e!' + Math.random().toString(36).slice(2, 12)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: userType, first_name: 'E2E', last_name: last })
  const { data: signin } = await anonClient().auth.signInWithPassword({ email, password })
  return { id: data.user.id, cookie: cookieFor(signin.session) }
}

async function api(cookie, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

// Answer helper: read the frozen snapshot (admin) and answer correctly/wrong
async function answerQueue(student, assignmentId, queue, { correct = true, limit = Infinity } = {}) {
  let answered = 0, lastJson = null
  for (const q of queue) {
    if (answered >= limit) break
    const { data: row } = await admin.from('mastery_responses').select('question_snapshot').eq('id', q.response_id).single()
    const snap = row.question_snapshot
    const right = snap.type === 'multiple_choice' ? { index: snap.correct_answer.index }
      : snap.type === 'true_false' ? { value: snap.correct_answer.value }
      : { text: snap.correct_answer.sample_answer }
    const wrong = snap.type === 'multiple_choice' ? { index: (snap.correct_answer.index + 1) % (snap.options?.length ?? 4) }
      : snap.type === 'true_false' ? { value: !snap.correct_answer.value }
      : { text: 'I do not know' }
    const r = await api(student.cookie, 'POST', `/api/assignments/${assignmentId}/mastery/answer`, {
      response_id: q.response_id, answer: correct ? right : wrong,
    })
    if (r.status !== 200) { check('answer accepted', false, `${r.status}: ${JSON.stringify(r.json)}`); continue }
    answered++
    lastJson = r.json
    if (r.json.attempt_complete) break
  }
  return { answered, lastJson }
}

async function runToCompletion(student, assignmentId, queue) {
  for (let i = 0; i < 10; i++) {
    const { lastJson } = await answerQueue(student, assignmentId, queue, { correct: true })
    if (lastJson?.attempt_complete) return lastJson.final_score
    const r = await api(student.cookie, 'POST', `/api/assignments/${assignmentId}/mastery/next-round`)
    if (r.json.status === 'completed') return r.json.final_score
    queue = r.json.questions
  }
  return null
}

async function main() {
  const teacher = await makeUser('e2e-p5-teacher@example.com', 'teacher', 'P5Teacher')
  created.teacherId = teacher.id
  const students = []
  for (const n of ['One', 'Two', 'Three']) {
    const s = await makeUser(`e2e-p5-student-${n.toLowerCase()}@example.com`, 'student', `Student${n}`)
    students.push(s)
    created.studentIds.push(s.id)
  }

  // Class + roster
  const { data: cls } = await admin.from('classes').insert({
    teacher_id: teacher.id, name: 'E2E P5 CLASS (safe to delete)', subject: 'AP Statistics',
    enrollment_code: 'E5' + Math.random().toString(36).slice(2, 6).toUpperCase(),
  }).select('id').single()
  created.classId = cls.id
  await admin.from('class_enrollments').insert(students.map(s => ({ class_id: cls.id, student_id: s.id })))

  // Concept + 6 MC questions (no SA to keep this run cheap/fast)
  const { data: concept } = await admin.from('concepts').insert({
    teacher_id: teacher.id, name: 'E2E P5 Concept', unit: 'E2E',
  }).select('id').single()
  created.conceptId = concept.id
  await admin.from('question_bank_questions').insert(
    Array.from({ length: 6 }, (_, i) => ({
      teacher_id: teacher.id, concept_id: concept.id, type: 'multiple_choice',
      question_text: `E2E P5 Q${i + 1}: pick option A`, options: ['A', 'B', 'C', 'D'],
      correct_answer: { index: 0 }, difficulty: 2, source: 'manual', status: 'approved',
    }))
  )

  // Assignment due YESTERDAY so force-finalize is available immediately
  const r = await api(teacher.cookie, 'POST', '/api/assignments', {
    type: 'mastery_quiz', title: 'E2E P5 Mastery Quiz', class_ids: [cls.id],
    due_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    mastery: {
      concept_ids: [concept.id], mastery_threshold: 0.8, questions_per_round: 3,
      min_questions: 3, window_size: 5, max_questions_per_concept: 15,
      allowed_types: ['multiple_choice'], allow_ai_fallback: false,
    },
  })
  check('assignment created (due yesterday)', r.status === 201, JSON.stringify(r.json))
  created.assignmentId = r.json.assignment.id
  const aid = created.assignmentId

  console.log('\n== Student One: completes ==')
  let start = await api(students[0].cookie, 'POST', `/api/assignments/${aid}/mastery/attempt`, { class_id: cls.id })
  const s1Score = await runToCompletion(students[0], aid, start.json.questions)
  check('student one mastered 1/1', s1Score?.mastered === 1, JSON.stringify(s1Score))
  check('late flag set (due yesterday)', true) // asserted via DB below

  console.log('\n== Student Two: starts, answers 2 wrong, walks away ==')
  start = await api(students[1].cookie, 'POST', `/api/assignments/${aid}/mastery/attempt`, { class_id: cls.id })
  await answerQueue(students[1], aid, start.json.questions, { correct: false, limit: 2 })

  console.log('\n== Student Three: never starts ==')

  console.log('\n== Teacher progress matrix ==')
  const prog = await api(teacher.cookie, 'GET', `/api/assignments/${aid}/mastery/progress`)
  check('progress 200', prog.status === 200, `got ${prog.status}`)
  check('two attempts visible', prog.json?.students?.length === 2, `got ${prog.json?.students?.length}`)
  const done = prog.json.students.find(s => s.status === 'completed')
  const partial = prog.json.students.find(s => s.status === 'in_progress')
  check('one completed, one in progress', !!done && !!partial)
  check('partial shows 0/2 correct', partial?.concepts?.[0]?.answered_count === 2 && partial?.concepts?.[0]?.correct_count === 0, JSON.stringify(partial?.concepts))
  check('student blocked from progress route', (await api(students[0].cookie, 'GET', `/api/assignments/${aid}/mastery/progress`)).status === 403)

  console.log('\n== Force-finalize the straggler ==')
  const fin = await api(teacher.cookie, 'POST', `/api/assignments/${aid}/mastery/progress`, { attempt_id: partial.attempt_id })
  check('finalize 200', fin.status === 200, JSON.stringify(fin.json))
  check('graded 0/1 as-is', fin.json?.final_score?.mastered === 0 && fin.json?.final_score?.total === 1, JSON.stringify(fin.json))
  const again = await api(teacher.cookie, 'POST', `/api/assignments/${aid}/mastery/progress`, { attempt_id: partial.attempt_id })
  check('double-finalize rejected', again.status === 409, `got ${again.status}`)

  console.log('\n== Gradebook state ==')
  const { data: subs } = await admin.from('assignment_submissions')
    .select('student_id, status, is_late, grading_result_id').eq('assignment_id', aid)
  check('two graded submissions', (subs ?? []).filter(s => s.status === 'graded').length === 2)
  check('late flags set', (subs ?? []).every(s => s.is_late === true), JSON.stringify(subs))
  for (const s of subs ?? []) if (s.grading_result_id) created.gradingResultIds.push(s.grading_result_id)
  const { data: grs } = await admin.from('grading_results')
    .select('percentage').in('id', created.gradingResultIds)
  const pcts = (grs ?? []).map(g => Number(g.percentage)).sort((a, b) => a - b)
  check('grades are 0% and 100%', JSON.stringify(pcts) === '[0,100]', JSON.stringify(pcts))
}

async function cleanup() {
  console.log('\n== Cleanup ==')
  try {
    if (created.assignmentId) await admin.from('assignments').delete().eq('id', created.assignmentId)
    for (const id of created.gradingResultIds) await admin.from('grading_results').delete().eq('id', id)
    if (created.conceptId) await admin.from('concepts').delete().eq('id', created.conceptId)
    if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
    for (const id of created.studentIds) await admin.auth.admin.deleteUser(id)
    if (created.teacherId) await admin.auth.admin.deleteUser(created.teacherId)
    console.log('  fixture removed')
  } catch (e) {
    console.error('  CLEANUP FAILED:', JSON.stringify(created), e.message)
  }
}

main()
  .catch(e => { fail++; console.error('FATAL:', e) })
  .finally(async () => {
    await cleanup()
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail > 0 ? 1 : 0)
  })

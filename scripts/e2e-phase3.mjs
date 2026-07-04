// Phase 3 E2E: AI suggestions (suggest -> approve/edit/decline + review
// events) and runtime AI fallback when the bank is exhausted mid-attempt.
// Uses a disposable test teacher AND test student; cleans everything up.
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

const created = { teacherId: null, studentId: null, classId: null, conceptId: null, assignmentId: null, gradingResultIds: [] }

function cookieFor(session) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const CHUNK = 3180
  if (value.length <= CHUNK) return `${name}=${value}`
  const parts = []
  for (let i = 0; i * CHUNK < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`)
  return parts.join('; ')
}

async function makeUser(email, userType, name) {
  const { data: prior } = await admin.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (prior) await admin.auth.admin.deleteUser(prior.id)
  const password = 'E2e!' + Math.random().toString(36).slice(2, 12)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: userType, first_name: 'E2E', last_name: name })
  const { data: signin, error: e2 } = await anonClient().auth.signInWithPassword({ email, password })
  if (e2) throw e2
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

async function main() {
  const teacher = await makeUser('e2e-p3-teacher@example.com', 'teacher', 'TestTeacher')
  created.teacherId = teacher.id
  const student = await makeUser('e2e-p3-student@example.com', 'student', 'TestStudent')
  created.studentId = student.id

  console.log('\n== Teacher: concept + manual question via API ==')
  let r = await api(teacher.cookie, 'POST', '/api/concepts', {
    name: 'E2E P3 Stoichiometry: mole ratios', unit: 'E2E', description: 'Convert between moles of reactants and products using balanced equations.',
  })
  check('concept created via API', r.status === 201, `got ${r.status}: ${JSON.stringify(r.json)}`)
  created.conceptId = r.json.concept.id

  r = await api(teacher.cookie, 'POST', '/api/question-bank', {
    concept_id: created.conceptId, type: 'multiple_choice',
    question_text: 'E2E P3: In 2H2 + O2 -> 2H2O, how many moles of water form from 4 mol H2?',
    options: ['1', '2', '4', '8'], correct_answer: { index: 2 }, difficulty: 2,
  })
  check('manual question created via API', r.status === 201, `got ${r.status}: ${JSON.stringify(r.json)}`)

  console.log('\n== AI suggestions ==')
  r = await api(teacher.cookie, 'POST', '/api/question-bank/suggest', {
    concept_ids: [created.conceptId], count: 4,
  })
  check('suggest returns 201', r.status === 201, `got ${r.status}: ${JSON.stringify(r.json)}`)
  check('created 4 suggestions', r.json?.total_created === 4, `got ${r.json?.total_created}`)

  const { data: suggestions } = await admin.from('question_bank_questions')
    .select('id, type, question_text, options, correct_answer, source, status')
    .eq('concept_id', created.conceptId).eq('status', 'suggested')
  check('suggestions have source ai_suggested', suggestions?.every(s => s.source === 'ai_suggested'))
  check('suggestion shapes valid', (suggestions ?? []).every(s =>
    s.type !== 'multiple_choice' || (Array.isArray(s.options) && typeof s.correct_answer.index === 'number' && s.correct_answer.index < s.options.length)
  ))

  // Approve one, edit one, decline one
  const [a, b, c] = suggestions
  r = await api(teacher.cookie, 'PATCH', `/api/question-bank/${a.id}`, { status: 'approved' })
  check('approve works', r.status === 200)
  r = await api(teacher.cookie, 'PATCH', `/api/question-bank/${b.id}`, { question_text: b.question_text + ' (edited)' })
  check('edit works', r.status === 200)
  r = await api(teacher.cookie, 'PATCH', `/api/question-bank/${c.id}`, { status: 'declined' })
  check('decline works', r.status === 200)

  const { data: events } = await admin.from('question_review_events')
    .select('action, question_id, before_snapshot, after_snapshot').eq('teacher_id', teacher.id)
  const actions = (events ?? []).map(e => e.action).sort()
  check('review events captured (approve/decline/edit)', JSON.stringify(actions) === JSON.stringify(['approve', 'decline', 'edit']), JSON.stringify(actions))
  const editEvent = (events ?? []).find(e => e.action === 'edit')
  check('edit event has before/after snapshots', !!editEvent?.before_snapshot && !!editEvent?.after_snapshot &&
    editEvent.before_snapshot.question_text !== editEvent.after_snapshot.question_text)

  console.log('\n== Runtime fallback (bank exhaustion mid-attempt) ==')
  // Class + enrollment
  const { data: cls } = await admin.from('classes').insert({
    teacher_id: teacher.id, name: 'E2E P3 CLASS (safe to delete)', subject: 'AP Chemistry',
    enrollment_code: 'E2P' + Math.random().toString(36).slice(2, 5).toUpperCase(),
  }).select('id').single()
  created.classId = cls.id
  await admin.from('class_enrollments').insert({ class_id: cls.id, student_id: student.id })

  // Keep the bank tiny: decline the approved suggestion again so only the
  // manual question + 1 approved suggestion exist -> exhaustion by round 2.
  // (bank now: manual MC + suggestion 'a' approved = 2 approved questions)
  r = await api(teacher.cookie, 'POST', '/api/assignments', {
    type: 'mastery_quiz', title: 'E2E P3 Mastery Quiz', class_ids: [cls.id],
    mastery: {
      concept_ids: [created.conceptId], mastery_threshold: 0.8, questions_per_round: 3,
      min_questions: 4, window_size: 5, max_questions_per_concept: 15,
      allowed_types: ['multiple_choice', 'true_false', 'short_answer'], allow_ai_fallback: true,
    },
  })
  check('mastery assignment created via API', r.status === 201, `got ${r.status}: ${JSON.stringify(r.json)}`)
  created.assignmentId = r.json.assignment.id
  check('total marks = concept count', r.json.assignment.total_possible_marks === 1)

  // Student starts: 2 approved in bank, 3 per round -> round 1 must trigger generation
  r = await api(student.cookie, 'POST', `/api/assignments/${created.assignmentId}/mastery/attempt`, { class_id: cls.id })
  check('attempt started', r.status === 201, `got ${r.status}: ${JSON.stringify(r.json)}`)
  check('round 1 has 3 questions despite 2-question bank', r.json?.questions?.length === 3, `got ${r.json?.questions?.length}`)

  const { data: runtimeQs } = await admin.from('question_bank_questions')
    .select('id, source, status').eq('concept_id', created.conceptId).eq('source', 'ai_runtime')
  check('runtime questions generated + queued for review', (runtimeQs ?? []).length > 0 && runtimeQs.every(q => q.status === 'suggested'), `got ${runtimeQs?.length}`)

  // Answer everything correctly by reading the frozen snapshots (admin-side)
  const attemptId = r.json.attempt.id
  let queue = r.json.questions
  let complete = false, answered = 0, finalScore = null
  while (!complete && answered < 20) {
    for (const q of queue) {
      const { data: row } = await admin.from('mastery_responses').select('question_snapshot').eq('id', q.response_id).single()
      const snap = row.question_snapshot
      const answer = snap.type === 'multiple_choice' ? { index: snap.correct_answer.index }
        : snap.type === 'true_false' ? { value: snap.correct_answer.value }
        : { text: snap.correct_answer.sample_answer }
      const r2 = await api(student.cookie, 'POST', `/api/assignments/${created.assignmentId}/mastery/answer`, { response_id: q.response_id, answer })
      if (r2.status !== 200) { check('answer accepted', false, `${r2.status}: ${JSON.stringify(r2.json)}`); continue }
      answered++
      if (r2.json.attempt_complete) { complete = true; finalScore = r2.json.final_score; break }
    }
    if (complete) break
    const r3 = await api(student.cookie, 'POST', `/api/assignments/${created.assignmentId}/mastery/next-round`)
    if (r3.json.status === 'completed') { complete = true; finalScore = r3.json.final_score }
    else queue = r3.json.questions
  }
  check('attempt completed with AI-generated questions in the mix', complete && finalScore?.mastered === 1, JSON.stringify(finalScore))
  check('min_questions=4 respected', answered >= 4, `answered ${answered}`)

  const { data: sub } = await admin.from('assignment_submissions')
    .select('status, grading_result_id').eq('assignment_id', created.assignmentId).eq('student_id', student.id).single()
  check("submission 'graded'", sub?.status === 'graded')
  if (sub?.grading_result_id) created.gradingResultIds.push(sub.grading_result_id)

  console.log('\n== Cross-teacher isolation ==')
  const rIso = await api(student.cookie, 'GET', '/api/concepts')
  check('student blocked from teacher bank routes', rIso.status === 403, `got ${rIso.status}`)
}

async function cleanup() {
  console.log('\n== Cleanup ==')
  try {
    if (created.assignmentId) await admin.from('assignments').delete().eq('id', created.assignmentId)
    for (const id of created.gradingResultIds) await admin.from('grading_results').delete().eq('id', id)
    if (created.conceptId) await admin.from('concepts').delete().eq('id', created.conceptId)
    if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
    if (created.studentId) await admin.auth.admin.deleteUser(created.studentId)
    if (created.teacherId) await admin.auth.admin.deleteUser(created.teacherId)
    console.log('  fixture removed')
  } catch (e) {
    console.error('  CLEANUP FAILED — remove manually:', JSON.stringify(created), e.message)
  }
}

main()
  .catch(e => { fail++; console.error('FATAL:', e) })
  .finally(async () => {
    await cleanup()
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail > 0 ? 1 : 0)
  })

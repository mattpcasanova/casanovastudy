// End-to-end verification of the mastery quiz loop against the dev server.
// Creates an isolated fixture (test class + test student + concept + bank),
// drives the real API routes with the student's session cookie, asserts the
// full loop, then cleans everything up.
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = '/Users/mattcasanova/Projects/casanovastudy'
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const BASE = 'http://localhost:3000'

// --- env ---
const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !SERVICE || !ANON) throw new Error('Missing Supabase env')
const REF = new globalThis.URL(URL).hostname.split('.')[0]

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let pass = 0
let fail = 0
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

// --- fixture bookkeeping for cleanup ---
const created = { userId: null, classId: null, conceptId: null, assignmentId: null, gradingResultIds: [] }

function cookieHeaderFor(session) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const CHUNK = 3180
  if (value.length <= CHUNK) return `${name}=${value}`
  const parts = []
  for (let i = 0; i * CHUNK < value.length; i++) {
    parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`)
  }
  return parts.join('; ')
}

async function api(cookie, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

async function main() {
  // --- teacher ---
  const { data: teacher } = await admin
    .from('user_profiles').select('id').eq('email', 'mattpcasanova@gmail.com').eq('user_type', 'teacher').single()
  if (!teacher) throw new Error('Teacher account not found')

  // --- test student ---
  const email = 'e2e-mastery-test-student@example.com'
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  // Remove leftover from a previous run
  const { data: prior } = await admin.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (prior) await admin.auth.admin.deleteUser(prior.id)

  const { data: newUser, error: userErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (userErr) throw userErr
  created.userId = newUser.user.id
  await admin.from('user_profiles').insert({
    id: created.userId, email, user_type: 'student', first_name: 'E2E', last_name: 'TestStudent',
  })

  // --- class + enrollment ---
  const { data: cls, error: clsErr } = await admin.from('classes').insert({
    teacher_id: teacher.id, name: 'E2E TEST CLASS (safe to delete)', period: null,
    subject: 'AP Statistics', enrollment_code: 'E2E' + Math.random().toString(36).slice(2, 5).toUpperCase(),
  }).select('id').single()
  if (clsErr) throw clsErr
  created.classId = cls.id
  await admin.from('class_enrollments').insert({ class_id: cls.id, student_id: created.userId })

  // --- concept + bank (3 MC, 1 TF, 1 SA) ---
  const { data: concept } = await admin.from('concepts').insert({
    teacher_id: teacher.id, name: 'E2E TEST Sampling Distributions', unit: 'E2E',
  }).select('id').single()
  created.conceptId = concept.id

  const fixtures = [
    { type: 'multiple_choice', question_text: 'E2E Q1: mean of sampling distribution of x-bar equals?', options: ['mu', 'sigma', 'n', 'p'], correct_answer: { index: 0 }, explanation: 'Unbiased estimator.' },
    { type: 'multiple_choice', question_text: 'E2E Q2: SD of x-bar equals?', options: ['sigma', 'sigma/sqrt(n)', 'sigma/n', 's'], correct_answer: { index: 1 } },
    { type: 'multiple_choice', question_text: 'E2E Q3: CLT applies when n is at least?', options: ['10', '20', '30', '100'], correct_answer: { index: 2 } },
    { type: 'true_false', question_text: 'E2E Q4: Increasing n decreases the SD of x-bar.', options: null, correct_answer: { value: true } },
    { type: 'short_answer', question_text: 'E2E Q5: What happens to the sampling distribution of the mean as n grows?', options: null, correct_answer: { sample_answer: 'It becomes approximately normal and its standard deviation shrinks (sigma over root n).', rubric_notes: 'Accept any answer mentioning normality and decreasing spread.' } },
  ]
  const { data: qRows, error: qErr } = await admin.from('question_bank_questions').insert(
    fixtures.map(f => ({ teacher_id: teacher.id, concept_id: concept.id, source: 'manual', status: 'approved', difficulty: 2, ...f }))
  ).select('id, question_text')
  if (qErr) throw qErr
  const byText = new Map(fixtures.map(f => [f.question_text, f]))

  // --- assignment + config + links ---
  const { data: assignment } = await admin.from('assignments').insert({
    teacher_id: teacher.id, type: 'mastery_quiz', title: 'E2E TEST Mastery Quiz',
    total_possible_marks: 1, is_published: true,
  }).select('id').single()
  created.assignmentId = assignment.id
  await admin.from('assignment_mastery_config').insert({
    assignment_id: assignment.id, mastery_threshold: 0.8, window_size: 5,
    min_questions: 3, max_questions_per_concept: 15, questions_per_round: 3,
    allowed_types: ['multiple_choice', 'true_false', 'short_answer'], allow_ai_fallback: true,
  })
  await admin.from('assignment_mastery_concepts').insert({ assignment_id: assignment.id, concept_id: concept.id })
  await admin.from('assignment_class_links').insert({ assignment_id: assignment.id, class_id: cls.id })

  // --- student session cookie ---
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: signin, error: signinErr } = await anon.auth.signInWithPassword({ email, password })
  if (signinErr) throw signinErr
  const cookie = cookieHeaderFor(signin.session)

  console.log('\n== GET attempt (before start) ==')
  let r = await api(cookie, 'GET', `/api/assignments/${assignment.id}/mastery/attempt`)
  check('200', r.status === 200, `got ${r.status}: ${JSON.stringify(r.json)}`)
  check('attempt is null', r.json?.attempt === null)
  check('concepts listed', r.json?.concepts?.length === 1)

  console.log('\n== POST attempt (start) ==')
  r = await api(cookie, 'POST', `/api/assignments/${assignment.id}/mastery/attempt`, { class_id: cls.id })
  check('201', r.status === 201, `got ${r.status}: ${JSON.stringify(r.json)}`)
  check('attempt in_progress', r.json?.attempt?.status === 'in_progress')
  check('3 questions served (per-round)', r.json?.questions?.length === 3, `got ${r.json?.questions?.length}`)
  const leaked = JSON.stringify(r.json?.questions ?? []).includes('correct_answer')
  check('no correct_answer leaked to student', !leaked)

  // submission projection on start
  let { data: sub } = await admin.from('assignment_submissions')
    .select('status').eq('assignment_id', assignment.id).eq('student_id', created.userId).maybeSingle()
  check("submission row 'submitted' on start", sub?.status === 'submitted', `got ${sub?.status}`)

  // --- answer loop ---
  let queue = r.json.questions
  let answered = 0
  let wrongDone = false
  let saTested = false
  let complete = false
  let finalScore = null

  const answerFor = (q, wrong) => {
    const f = byText.get(q.question_text)
    if (!f) throw new Error(`Unknown question: ${q.question_text}`)
    if (q.type === 'multiple_choice') return { index: wrong ? (f.correct_answer.index + 1) % f.options.length : f.correct_answer.index }
    if (q.type === 'true_false') return { value: wrong ? !f.correct_answer.value : f.correct_answer.value }
    return { text: wrong ? 'no idea' : f.correct_answer.sample_answer }
  }

  console.log('\n== Answer loop ==')
  let resumeTested = false
  while (!complete && answered < 25) {
    for (const q of queue) {
      const makeWrong = !wrongDone && q.type !== 'short_answer'
      const r2 = await api(cookie, 'POST', `/api/assignments/${assignment.id}/mastery/answer`, {
        response_id: q.response_id, answer: answerFor(q, makeWrong),
      })
      if (r2.status !== 200) {
        check(`answer accepted (${q.type})`, false, `got ${r2.status}: ${JSON.stringify(r2.json)}`)
        continue
      }
      answered++
      if (makeWrong) {
        check('deliberate wrong answer marked incorrect', r2.json.is_correct === false)
        check('correct answer revealed post-answer', r2.json.correct_answer != null)
        wrongDone = true
      } else if (q.type === 'short_answer') {
        check('SA graded correct by Haiku', r2.json.is_correct === true, `score=${r2.json.score} fb=${r2.json.feedback}`)
        check('SA has feedback', typeof r2.json.feedback === 'string' && r2.json.feedback.length > 0)
        saTested = true
      }
      if (r2.json.attempt_complete) {
        complete = true
        finalScore = r2.json.final_score
        break
      }
    }
    if (complete) break

    // Test resume once: GET should return no pending questions after a full round
    if (!resumeTested) {
      const rr = await api(cookie, 'GET', `/api/assignments/${assignment.id}/mastery/attempt`)
      check('resume GET works mid-quiz', rr.status === 200 && rr.json?.attempt?.status === 'in_progress')
      resumeTested = true
    }

    const r3 = await api(cookie, 'POST', `/api/assignments/${assignment.id}/mastery/next-round`)
    if (r3.status !== 200) {
      check('next-round', false, `got ${r3.status}: ${JSON.stringify(r3.json)}`)
      break
    }
    if (r3.json.status === 'completed') {
      complete = true
      finalScore = r3.json.final_score
    } else {
      queue = r3.json.questions
      check(`round ${r3.json.round} served ${queue.length} questions`, queue.length > 0)
    }
  }

  console.log(`\n== Completion (answered ${answered}) ==`)
  check('attempt completed', complete)
  check('mastered 1/1', finalScore?.mastered === 1 && finalScore?.total === 1, JSON.stringify(finalScore))
  check('SA path exercised', saTested)
  // window math: wrong first, then correct answers → mastered at 5 answered ([F,T,T,T,T] = 0.8)
  check('window recovery took 5 answers', answered === 5, `took ${answered}`)

  // --- gradebook projection ---
  const { data: subFinal } = await admin.from('assignment_submissions')
    .select('id, status, grading_result_id').eq('assignment_id', assignment.id).eq('student_id', created.userId).single()
  check("submission 'graded'", subFinal?.status === 'graded', `got ${subFinal?.status}`)
  check('grading_result linked', !!subFinal?.grading_result_id)
  if (subFinal?.grading_result_id) {
    created.gradingResultIds.push(subFinal.grading_result_id)
    const { data: gr } = await admin.from('grading_results')
      .select('total_marks, total_possible_marks, percentage, grade, exam_title, student_name, assignment_submission_id')
      .eq('id', subFinal.grading_result_id).single()
    check('grading_results 1/1 100% A', gr?.total_marks === 1 && gr?.total_possible_marks === 1 && Number(gr?.percentage) === 100 && gr?.grade === 'A', JSON.stringify(gr))
    check('back-linked to submission', gr?.assignment_submission_id === subFinal.id)
  }

  // --- double-submit + auth guards ---
  console.log('\n== Guards ==')
  const anyResponse = await admin.from('mastery_responses').select('id').eq('attempt_id', r.json.attempt.id).limit(1).single()
  const dup = await api(cookie, 'POST', `/api/assignments/${assignment.id}/mastery/answer`, {
    response_id: anyResponse.data.id, answer: { index: 0 },
  })
  check('re-answering answered question rejected', dup.status === 409 || dup.status === 400, `got ${dup.status}`)
  const noAuth = await fetch(`${BASE}/api/assignments/${assignment.id}/mastery/attempt`)
  check('unauthenticated GET rejected', noAuth.status === 401, `got ${noAuth.status}`)
  // File-upload submit must reject mastery assignments
  const wrongSubmit = await api(cookie, 'POST', `/api/assignments/${assignment.id}/submit`, {
    files: [{ url: 'https://example.com/fake.pdf' }], class_id: cls.id,
  })
  check('file submit rejected for mastery quiz', wrongSubmit.status === 400, `got ${wrongSubmit.status}`)
}

async function cleanup() {
  console.log('\n== Cleanup ==')
  try {
    if (created.assignmentId) await admin.from('assignments').delete().eq('id', created.assignmentId)
    for (const id of created.gradingResultIds) await admin.from('grading_results').delete().eq('id', id)
    if (created.conceptId) await admin.from('concepts').delete().eq('id', created.conceptId)
    if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
    if (created.userId) await admin.auth.admin.deleteUser(created.userId)
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

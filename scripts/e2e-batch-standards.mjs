// End-to-end check of standards on a graded class set (2026-11-08, migration 087):
// a throwaway teacher and a seeded 8-question set, standards saved through the
// batch PATCH, then one real class-report call that must come back grouped by
// standard. Deletes everything after. One AI call (~$0.05). Dev server on :3000:
//   node scripts/e2e-batch-standards.mjs [--no-ai]
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const BASE = process.env.E2E_BASE || 'http://localhost:3000'
const NO_AI = process.argv.includes('--no-ai')

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let pass = 0
let fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

const created = { users: [], batchId: randomUUID() }

async function makeUser(kind, first, last) {
  const email = `e2e-standards-${kind}-${Date.now()}@example.com`
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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

// 8 questions: 1-4 slope from two points / a graph, 5-8 solving linear equations.
const QUESTIONS = [
  ['1', 2, 'Find the slope of the line through (2, 3) and (6, 11).'],
  ['2', 2, 'Find the slope from the graph (rise over run).'],
  ['3', 2, 'Slope of a horizontal line through (1, 4) and (5, 4).'],
  ['4', 2, 'Rate of change from the table of x and y values.'],
  ['5', 3, 'Solve 3x + 7 = 22.'],
  ['6', 3, 'Solve 2(x - 4) = 10.'],
  ['7', 3, 'Solve 5x - 3 = 2x + 9.'],
  ['8', 3, 'Solve (x / 2) + 1 = 7.'],
]
const paper = (marks, feedback) => QUESTIONS.map(([label, possible, text], i) => ({
  questionNumber: label, marksAwarded: marks[i], marksPossible: possible,
  explanation: marks[i] === possible ? `Correct. ${text}` : `${feedback[i] ?? 'Partly right.'} (${text})`,
}))

async function main() {
  const teacher = await makeUser('teacher', 'E2E', 'Teacher')
  const student = await makeUser('student', 'Sean', 'Miller')
  const t = client(teacher.session)
  const s = client(student.session)

  console.log('\n== Seed a graded set ==')
  const students = [
    ['Ava Kim', [2, 2, 2, 2, 3, 3, 3, 3], []],
    ['Sean Miller', [2, 0, 2, 1, 3, 1, 0, 3], [null, 'Swapped rise and run.', null, 'Read the table backwards.', null, 'Forgot to distribute the 2.', 'Moved 2x to the wrong side.']],
    ['Mary Ann Lee', [1, 0, 0, 2, 3, 3, 1, 2], ['Subtracted in the wrong order.', 'Swapped rise and run.', 'Said undefined instead of 0.', null, null, null, 'Sign error moving terms.', 'Did not undo the division.']],
    ['Brandon Okafor', [2, 1, 2, 2, 0, 2, 0, 1], [null, 'Counted the run wrong.', null, null, 'Divided before subtracting 7.', 'Arithmetic slip.', 'Moved 2x to the wrong side.', 'Did not undo the division.']],
  ]
  const rows = students.map(([name, marks, fb]) => ({
    user_id: teacher.id, batch_id: created.batchId, student_name: name, student_exam_filename: 'e2e', total_marks: marks.reduce((a, b) => a + b, 0), total_possible_marks: 20,
    percentage: marks.reduce((a, b) => a + b, 0) * 5, grade: 'X', content: 'e2e', grade_breakdown: paper(marks, fb), released: false, exam_title: 'E2E Slope and Equations Quiz',
  }))
  const { error } = await admin.from('grading_results').insert(rows)
  if (error) throw error

  console.log('\n== Standards on the set ==')
  let r = await t('GET', `/api/grade-batch/${created.batchId}`)
  check('a set with no grading_batches row loads with no standards', r.status === 200 && !r.json?.setup?.standards, JSON.stringify(r.json?.setup))
  r = await s('PATCH', `/api/grade-batch/${created.batchId}`, { standards: 'MA.8.AR.3.2' })
  check('a student cannot set standards', r.status === 403 || r.status === 404, `got ${r.status}`)
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { standards: 42 })
  check('non-text standards are refused', r.status === 400)
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { standards: '  MA.8.AR.3.2,   MA.8.AR.2.1  \n\n\n' })
  check('standards saved, tidied', r.status === 200 && r.json?.standards === 'MA.8.AR.3.2, MA.8.AR.2.1', JSON.stringify(r.json))
  r = await t('GET', `/api/grade-batch/${created.batchId}`)
  check('GET returns them in setup', r.json?.setup?.standards === 'MA.8.AR.3.2, MA.8.AR.2.1', JSON.stringify(r.json?.setup))
  check('no report yet', r.json?.insights === null)

  console.log('\n== Florida standards search ==')
  r = await t('GET', '/api/standards/search?q=MA.8.AR.3')
  check('a code prefix finds the Florida benchmarks', r.status === 200 && r.json?.results?.length >= 2 && r.json.results.every((x) => x.code.startsWith('MA.8.AR.3')), JSON.stringify(r.json?.results?.slice(0, 2)))
  r = await t('GET', '/api/standards/search?q=slope&grade=6th-8th&subject=mathematics')
  check('words find them too, grade 8 math first', r.status === 200 && r.json?.results?.[0]?.code.startsWith('MA.8.') && /slope/i.test(r.json.results[0].text), JSON.stringify(r.json?.results?.[0]))
  check('every hit links to CPALMS', (r.json?.results ?? []).every((x) => x.url?.startsWith('https://www.cpalms.org/')))
  r = await s('GET', '/api/standards/search?q=slope')
  check('students can search too (signed in)', r.status === 200)
  r = await fetch(`${BASE}/api/standards/search?q=slope`)
  check('signed out is refused', r.status === 401)

  if (NO_AI) { console.log('  (skipping the class report: --no-ai)'); return }

  console.log('\n== Class report by standard ==')
  const t0 = Date.now()
  r = await t('POST', `/api/grade-batch/${created.batchId}/insights`)
  const topics = r.json?.insights?.topics ?? []
  console.log(`  ${Math.round((Date.now() - t0) / 1000)} s; topics: ${topics.map((x) => `${x.name} [${x.questions.join(' ')}]`).join(' | ')}`)
  check('report written', r.status === 200 && topics.length > 0, JSON.stringify(r.json))
  check('exactly one topic per standard', topics.length === 2, `${topics.length}`)
  const codeOf = (name) => (name.match(/\(([^()]+)\)\s*$/) || [])[1]
  check('every topic ends with one of the codes', topics.every((x) => ['MA.8.AR.3.2', 'MA.8.AR.2.1'].includes(codeOf(x.name))), topics.map((x) => x.name).join(' | '))
  const labelsOf = (code) => topics.filter((x) => codeOf(x.name) === code).flatMap((x) => x.questions.map((q) => q.replace(/^question\s*/i, '')))
  const slope = labelsOf('MA.8.AR.3.2')
  const eqs = labelsOf('MA.8.AR.2.1')
  check('slope questions under the slope standard', ['1', '2', '3', '4'].every((q) => slope.includes(q)), slope.join(','))
  check('equation questions under the equations standard', ['5', '6', '7', '8'].every((q) => eqs.includes(q)), eqs.join(','))
  check('every question placed once', slope.length + eqs.length === 8, `${slope.length + eqs.length}`)
  const names = topics.map((x) => x.name.replace(/\s*\([^()]+\)\s*$/, ''))
  check('topics named in plain words, not just the code', names.every((n) => /[a-z]/i.test(n) && n.length >= 4), names.join(' | '))

  r = await t('GET', `/api/grade-batch/${created.batchId}`)
  check('the saved report is current', r.json?.insights?.current === true && !r.json?.insights?.stale)
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { standards: 'MA.8.AR.3.2, MA.8.AR.2.1, MA.8.F.1.1' })
  r = await t('GET', `/api/grade-batch/${created.batchId}`)
  check('changing the standards marks the report stale (standards, not marks)', r.json?.insights?.current === false && r.json?.insights?.stale === 'standards', JSON.stringify(r.json?.insights && { current: r.json.insights.current, stale: r.json.insights.stale }))
  r = await t('PATCH', `/api/grade-batch/${created.batchId}`, { standards: '' })
  check('standards can be cleared', r.status === 200 && r.json?.standards === null, JSON.stringify(r.json))
}

async function cleanup() {
  await admin.from('grading_results').delete().eq('batch_id', created.batchId)
  await admin.from('grading_batch_insights').delete().eq('batch_id', created.batchId)
  await admin.from('grading_batches').delete().eq('batch_id', created.batchId)
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

// Time limits on assigned practice (2026-10-30), end to end against the dev
// server (:3000): a teacher assigns a quiz with a 1-minute limit, the student
// sees the Start gate, the countdown, keeps the clock across a reload, and the
// run is handed in when time runs out; the teacher sees how long it took.
// Creates throwaway users and deletes them.   node scripts/e2e-time-limit.mjs [shotsDir]
import { mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const BASE = process.env.E2E_BASE || 'http://localhost:3000'
const SHOTS = process.argv[2]
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const REF = new URL(URL_).hostname.split('.')[0]
const users = []
const classes = []
let failures = 0
const check = (what, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || !extra ? '' : `  (${extra})`}`); if (!ok) failures++ }

async function makeUser(type, first) {
  const email = `e2e-time-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  const password = 'E2e-pass-' + Math.random().toString(36).slice(2)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: type, first_name: first, last_name: 'Timer', birth_date: type === 'teacher' ? '1980-01-01' : '2009-01-01' })
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  return { id: data.user.id, email, session: s.session }
}

const api = (session) => async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, json: await res.json().catch(() => null) }
}

function cookiesFor(session) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const base = { domain: 'localhost', path: '/', sameSite: 'Lax' }
  const out = []
  for (let i = 0; i * 3180 < value.length; i++) out.push({ ...base, name: `${name}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) })
  return out
}

const QUIZ = `# Cells quiz

## Organelles

MC_QUESTION: Which organelle makes most of a cell's energy?
A) Nucleus
B) Mitochondria
C) Ribosome
D) Vacuole
Correct Answer: B
Explanation: Mitochondria release energy from glucose.

MC_QUESTION: Which organelle holds the cell's DNA?
A) Nucleus
B) Mitochondria
C) Ribosome
D) Vacuole
Correct Answer: A
Explanation: The nucleus holds the chromosomes.

TF_QUESTION: Plant cells have a cell wall.
Answer: True
Explanation: The wall gives plant cells their shape.
`

const PRACTICE = `# Cells practice

MC_QUESTION: Which organelle makes most of a cell's energy?
A) Nucleus
B) Mitochondria
C) Ribosome
D) Vacuole
Correct Answer: B

TF_QUESTION: Plant cells have a cell wall.
Answer: True
`

async function main() {
  const teacher = await makeUser('teacher', 'Tara')
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const stu = await makeUser('student', 'Sofia')
  const t = api(teacher.session), s = api(stu.session)

  const { data: cls } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E Bio', period: '3', enrollment_code: 'T' + Math.random().toString(36).slice(2, 7).toUpperCase() }).select('id').single()
  classes.push(cls.id)
  const { data: roster } = await admin.from('class_roster').insert([{ class_id: cls.id, first_name: 'Sofia', last_name: 'Timer', email: stu.email, student_user_id: stu.id, linked_via: 'email' }]).select('id')
  const { data: guide } = await admin.from('study_guides').insert({ user_id: teacher.id, title: 'Cells quiz', subject: 'biology', grade_level: '9th', format: 'quiz', content: QUIZ, file_count: 0 }).select('id').single()
  const { data: pguide } = await admin.from('study_guides').insert({ user_id: teacher.id, title: 'Cells practice', subject: 'biology', grade_level: '9th', format: 'practice', content: PRACTICE, file_count: 0 }).select('id').single()

  let r = await t('POST', '/api/practice-assignments', { guideId: guide.id, classId: cls.id, rosterIds: [roster[0].id], timeLimitSeconds: 60, maxAttempts: 2 })
  check('teacher assigns a quiz with a 1-minute limit', r.status === 200 && r.json?.assignment?.time_limit_seconds === 60, JSON.stringify(r.json).slice(0, 200))
  const asg = r.json.assignment
  r = await t('POST', '/api/practice-assignments', { guideId: pguide.id, classId: cls.id, rosterIds: [roster[0].id], timeLimitSeconds: 600 })
  const pasg = r.json.assignment
  check('and a practice set with 10 minutes', pasg?.time_limit_seconds === 600)
  r = await s('GET', `/api/practice-assignments/${asg.id}/me`)
  check('student sees the limit on /me', r.json?.timeLimit === 60, JSON.stringify(r.json?.timeLimit))

  console.log('\n== Student in the browser ==')
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addCookies(cookiesFor(stu.session))
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(`${BASE}/study-guide/${guide.id}?assignment=${asg.id}`)
  await p.waitForSelector('text=You have 1 min for 3 questions', { timeout: 30000 })
  check('the quiz waits at a Start gate that names the limit', true)
  check('the banner says the clock starts on Start', await p.locator('text=Time limit 1 min').count() > 0)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/time-gate.png` })
  await p.getByRole('button', { name: 'Start', exact: true }).click()
  await p.waitForSelector('[role=timer]', { timeout: 5000 })
  const first = await p.getByRole('timer').getAttribute('aria-label')
  check('the countdown runs from the limit', /^(1:00|0:5\d) left$/.test(first || ''), first)
  await p.getByRole('button', { name: 'Test', exact: true }).click()
  await p.locator('[role=radiogroup] button').first().click()
  await p.waitForTimeout(4000)
  await p.reload()
  await p.waitForSelector('[role=timer]', { timeout: 30000 })
  const afterReload = await p.getByRole('timer').getAttribute('aria-label')
  check('a reload keeps the clock running (no new Start gate)', /^0:[45]\d left$/.test(afterReload || '') && (await p.locator('text=You have 1 min for').count()) === 0, afterReload)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/time-running.png` })
  await p.waitForSelector('text=Turned in', { timeout: 75000 })
  check('when time runs out the run is handed in by itself', true)
  check('the results say how long it took against the limit', (await p.locator('text=/of 1:00/').count()) > 0)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/time-results.png`, fullPage: true })
  check('no page errors', errors.length === 0, errors.join(' | '))

  await p.goto(`${BASE}/study-guide/${pguide.id}?assignment=${pasg.id}`)
  await p.waitForSelector('text=You have 10 min for 2 activities', { timeout: 30000 })
  check('practice sets get the gate too', true)
  await p.getByRole('button', { name: 'Start', exact: true }).click()
  await p.waitForSelector('[role=timer]', { timeout: 5000 })
  check('and a countdown', /^(10:00|9:5\d) left$/.test((await p.getByRole('timer').getAttribute('aria-label')) || ''))
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/time-practice.png` })
  await p.close()

  console.log('\n== Teacher ==')
  const { data: tries } = await admin.from('practice_attempts').select('seconds, correct, total, counted').eq('assignment_id', asg.id)
  check('the attempt recorded about 60 seconds', tries?.length === 1 && tries[0].seconds >= 58 && tries[0].seconds <= 70 && tries[0].counted, JSON.stringify(tries))
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('teacher API has the run length on the best attempt', r.json?.students?.[0]?.best?.seconds === tries?.[0]?.seconds, JSON.stringify(r.json?.students?.[0]?.best))
  const tctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await tctx.addCookies(cookiesFor(teacher.session))
  const tp = await tctx.newPage()
  await tp.goto(`${BASE}/teacher/practice/${asg.id}`)
  await tp.waitForSelector('text=/^1:0\\d$/', { timeout: 30000 }).then(() => check('teacher page shows the time taken', true)).catch(() => check('teacher page shows the time taken', false))
  check('the time limit select shows 1 min', (await tp.getByLabel('Time limit').inputValue()) === '60')
  if (SHOTS) await tp.screenshot({ path: `${SHOTS}/time-teacher.png` })
  await b.close()
}

main().catch((e) => { console.error(e); failures++ }).finally(async () => {
  for (const id of classes) await admin.from('classes').delete().eq('id', id)
  await admin.from('study_guides').delete().in('user_id', users)
  for (const id of users) await admin.auth.admin.deleteUser(id)
  console.log(failures ? `\n${failures} failed` : '\nall passed')
  process.exit(failures ? 1 : 0)
})

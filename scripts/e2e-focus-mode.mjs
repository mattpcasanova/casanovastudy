// Focus mode on assigned practice (2026-10-26), end to end against the dev
// server (:3000): a teacher assigns a quiz with focus mode, the student sees
// the notice, starts, leaves the page and tries to paste; the log reaches the
// teacher's assignment page. Also checks the route's guards. Creates throwaway
// users and deletes them.   node scripts/e2e-focus-mode.mjs [shotsDir]
import { mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const BASE = 'http://localhost:3000'
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
  const email = `e2e-focus-${type}-${first.toLowerCase()}-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: type, first_name: first, last_name: 'Focus', birth_date: type === 'teacher' ? '1980-01-01' : '2009-01-01' })
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

TF_QUESTION: Plant cells have a cell wall.
Answer: True
Explanation: The wall gives plant cells their shape.
`

async function main() {
  const teacher = await makeUser('teacher', 'Tara')
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const stu = await makeUser('student', 'Sofia')
  const other = await makeUser('student', 'Omar')
  const t = api(teacher.session), s = api(stu.session), o = api(other.session)

  const { data: cls } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E Bio', period: '3', enrollment_code: 'F' + Math.random().toString(36).slice(2, 7).toUpperCase() }).select('id').single()
  classes.push(cls.id)
  const { data: roster } = await admin.from('class_roster').insert([
    { class_id: cls.id, first_name: 'Sofia', last_name: 'Focus', email: stu.email, student_user_id: stu.id, linked_via: 'email' },
  ]).select('id')
  const { data: guide } = await admin.from('study_guides').insert({ user_id: teacher.id, title: 'Cells quiz', subject: 'biology', grade_level: '9th', format: 'quiz', content: QUIZ, file_count: 0 }).select('id').single()

  let r = await t('POST', '/api/practice-assignments', { guideId: guide.id, classId: cls.id, rosterIds: [roster[0].id], aiHelp: 'off', focusMode: true })
  check('teacher assigns with focus mode on', r.status === 200 && r.json?.assignment?.focus_mode === true, JSON.stringify(r.json).slice(0, 200))
  const asg = r.json.assignment
  r = await t('POST', '/api/practice-assignments', { guideId: guide.id, classId: cls.id, rosterIds: [roster[0].id] })
  const plain = r.json.assignment
  check('focus mode is off unless asked for', plain?.focus_mode === false)

  r = await s('GET', `/api/practice-assignments/${asg.id}/me`)
  check('student sees focusMode on /me', r.json?.focusMode === true, JSON.stringify(r.json))

  const now = Date.now()
  r = await s('POST', `/api/practice-assignments/${asg.id}/focus`, { events: [{ kind: 'start', at: new Date(now - 60000).toISOString() }, { kind: 'hack', at: new Date().toISOString() }] })
  check('route keeps good events and drops unknown kinds', r.status === 200 && r.json?.saved === 1, JSON.stringify(r.json))
  r = await o('POST', `/api/practice-assignments/${asg.id}/focus`, { events: [{ kind: 'copy', at: new Date().toISOString() }] })
  check('a student it is not assigned to is refused', r.status === 403, JSON.stringify(r.json))
  r = await s('POST', `/api/practice-assignments/${plain.id}/focus`, { events: [{ kind: 'copy', at: new Date().toISOString() }] })
  check('nothing is recorded on an assignment without focus mode', r.status === 200 && r.json?.saved === 0)
  await admin.from('assignment_focus_events').delete().eq('assignment_id', asg.id)

  console.log('\n== Student in the browser ==')
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addCookies(cookiesFor(stu.session))
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('pageerror', e.message))
  await p.goto(`${BASE}/study-guide/${guide.id}?assignment=${asg.id}`)
  await p.waitForSelector('text=Focus mode is on', { timeout: 20000 })
  check('student sees the focus mode notice before starting', true)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/focus-gate.png` })
  await p.getByRole('button', { name: 'Start' }).click()
  await p.waitForSelector('text=Focus mode: leaving this page is recorded')
  check('banner says leaving is recorded', true)
  // Leave for ~3 s: another window takes focus.
  await p.evaluate(() => window.dispatchEvent(new Event('blur')))
  await p.waitForTimeout(3100)
  await p.evaluate(() => window.dispatchEvent(new Event('focus')))
  await p.waitForSelector('text=/You left this page for \\d+s/', { timeout: 5000 }).then(() => check('student is told they left and for how long', true)).catch(() => check('student is told they left and for how long', false))
  const pasted = await p.evaluate(() => { const e = new Event('paste', { cancelable: true }); document.dispatchEvent(e); return e.defaultPrevented })
  check('paste is blocked', pasted)
  await p.waitForSelector('text=Pasting is off for this assignment.')
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/focus-on.png` })
  await p.waitForTimeout(16000) // the 15 s flush picks up the paste
  await p.close()

  const { data: events } = await admin.from('assignment_focus_events').select('kind, seconds').eq('assignment_id', asg.id).order('at')
  const kinds = (events ?? []).map((e) => e.kind)
  check('log has start, left (with seconds) and paste', kinds.includes('start') && kinds.includes('paste') && (events ?? []).some((e) => e.kind === 'left' && e.seconds >= 2), JSON.stringify(events))

  console.log('\n== Teacher ==')
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('teacher API returns the log per student', r.json?.students?.[0]?.focus?.length === (events ?? []).length, JSON.stringify(r.json?.students?.[0]?.focus))
  const tctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await tctx.addCookies(cookiesFor(teacher.session))
  const tp = await tctx.newPage()
  await tp.goto(`${BASE}/teacher/practice/${asg.id}`)
  const chip = tp.getByRole('button', { name: /Left the page 1×/ })
  await chip.waitFor({ timeout: 20000 }).then(() => check('teacher sees the "Left the page" chip', true)).catch(() => check('teacher sees the "Left the page" chip', false))
  await chip.click()
  await tp.waitForSelector('text=Tried to paste text')
  check('the chip opens the timeline', true)
  if (SHOTS) await tp.screenshot({ path: `${SHOTS}/focus-teacher.png` })
  await b.close()

  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { focusMode: false })
  r = await s('GET', `/api/practice-assignments/${asg.id}/me`)
  check('teacher can turn it off', r.json?.focusMode === false)
}

main().catch((e) => { console.error(e); failures++ }).finally(async () => {
  for (const id of classes) await admin.from('classes').delete().eq('id', id)
  await admin.from('study_guides').delete().in('user_id', users)
  for (const id of users) await admin.auth.admin.deleteUser(id)
  console.log(failures ? `\n${failures} failed` : '\nall passed')
  process.exit(failures ? 1 : 0)
})

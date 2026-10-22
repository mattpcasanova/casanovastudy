// Extra credit and points off, end to end against the dev server (:3000): a
// throwaway teacher with a 4-paper class set on a 40-mark test (one paper
// graded a day later). Applies +5% study-guide extra credit to 3 students and
// a 1-day late penalty through the API, checks totals, the report, editing
// marks on an adjusted report, students can't apply them, then drives the
// dialog, the Focus export (Comment column) and the report in a browser.
// Cleans up.   node scripts/e2e-grade-adjustments.mjs [shotsDir]
import { mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'

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
let classId = null
let failures = 0
const check = (what, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || !extra ? '' : `  (${extra})`}`); if (!ok) failures++ }

async function makeUser(type) {
  const email = `e2e-adjust-${type}-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: type, first_name: 'Ada', last_name: 'Just', birth_date: type === 'teacher' ? '1980-01-01' : '2008-01-01' })
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  return { id: data.user.id, session: s.session }
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

const breakdown = (a, b) => [
  { questionNumber: '1', marksAwarded: a, marksPossible: 20, explanation: 'Q1' },
  { questionNumber: '2', marksAwarded: b, marksPossible: 20, explanation: 'Q2' },
]

async function main() {
  const teacher = await makeUser('teacher')
  const student = await makeUser('student')
  const t = api(teacher.session)
  const batchId = randomUUID()
  const { data: cls } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E ADJUST CLASS (safe to delete)', period: '4', enrollment_code: 'J' + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z2-9]/g, 'X') }).select('id').single()
  classId = cls.id
  await admin.from('class_roster').insert([['Sean', 'Miller', '1001'], ['Mary Ann', 'Lee', '1002'], ['Ava', 'Kim', '1003'], ['Noah', 'Park', '1004']].map(([f, l, n]) => ({ class_id: cls.id, first_name: f, last_name: l, student_number: n })))
  const yesterday = new Date(Date.now() - 26 * 3600 * 1000).toISOString()
  const seeds = [['Sean Miller', 15, 15, yesterday], ['Mary Ann Lee', 10, 10, yesterday], ['Ava Kim', 20, 19, yesterday], ['Noah Park', 12, 12, new Date().toISOString()]]
  const { data: inserted } = await admin.from('grading_results').insert(seeds.map(([name, a, b, at]) => ({
    user_id: teacher.id, batch_id: batchId, student_name: name, student_exam_filename: 'e2e', total_marks: a + b, total_possible_marks: 40,
    percentage: ((a + b) / 40) * 100, grade: 'X', content: 'e2e', grade_breakdown: breakdown(a, b), released: false, exam_title: 'E2E Adjust Quiz', created_at: at,
  }))).select('id, student_name')
  const idOf = (name) => inserted.find((x) => x.student_name === name).id
  await t('PATCH', `/api/grade-batch/${batchId}`, { classId: cls.id })

  console.log('== API ==')
  const packet = { id: 'adj-packet01', kind: 'extra', amount: 5, unit: 'percent', reason: 'Extra credit: study guide packet' }
  let r = await t('PATCH', `/api/grade-batch/${batchId}`, { adjustment: packet, paperIds: ['Sean Miller', 'Mary Ann Lee', 'Ava Kim'].map(idOf) })
  check('extra credit saved on 3 papers', r.json?.changed === 3, JSON.stringify(r.json))
  const late = { id: 'adj-late0001', kind: 'deduct', amount: 10, unit: 'percent', reason: 'Late: 1 day', late: { days: 1, perDay: 10 } }
  r = await t('PATCH', `/api/grade-batch/${batchId}`, { adjustment: late, paperIds: [idOf('Noah Park')] })
  check('late penalty saved on 1 paper', r.json?.changed === 1)
  r = await t('GET', `/api/grade-batch/${batchId}`)
  const by = Object.fromEntries(r.json.results.map((x) => [x.student_name, x]))
  check('Sean 30/40 + 5% = 32/40 (80%)', Number(by['Sean Miller'].total_marks) === 32 && Number(by['Sean Miller'].percentage) === 80, `${by['Sean Miller'].total_marks} ${by['Sean Miller'].percentage}`)
  check('Ava 39/40 + 5% goes over: 41/40 (102.5%)', Number(by['Ava Kim'].percentage) === 102.5)
  check('Noah 24/40 - 10% = 20/40 (50%), grade F', Number(by['Noah Park'].percentage) === 50 && by['Noah Park'].grade === 'F', `${by['Noah Park'].percentage} ${by['Noah Park'].grade}`)
  check('question marks untouched', by['Sean Miller'].grade_breakdown[0].marksAwarded === 15)

  // Changing a mark on an adjusted report keeps the adjustment.
  r = await t('PATCH', `/api/grade-exam/${idOf('Sean Miller')}`, { gradeBreakdown: breakdown(16, 15) })
  check('editing a mark keeps the extra credit (31 + 2 = 33)', r.json?.data?.totalMarks === 33 && r.json?.data?.rawMarks === 31, JSON.stringify(r.json?.data))
  r = await t('GET', `/api/grade-exam/${idOf('Sean Miller')}`)
  check('report returns its adjustments', r.json?.data?.adjustments?.[0]?.reason === 'Extra credit: study guide packet')

  // Changing the shared one updates everyone; students can't do any of it.
  r = await t('PATCH', `/api/grade-batch/${batchId}`, { adjustment: { ...packet, amount: 10 }, paperIds: [idOf('Sean Miller'), idOf('Mary Ann Lee')] })
  r = await t('GET', `/api/grade-batch/${batchId}`)
  const by2 = Object.fromEntries(r.json.results.map((x) => [x.student_name, x]))
  check('changing it to 10% for 2 students: Sean 35, Ava back to 39', Number(by2['Sean Miller'].total_marks) === 35 && Number(by2['Ava Kim'].total_marks) === 39, `${by2['Sean Miller'].total_marks} ${by2['Ava Kim'].total_marks}`)
  r = await t('PATCH', `/api/grade-batch/${batchId}`, { adjustment: { id: 'adj-late0002', kind: 'deduct', amount: 20, unit: 'percent', reason: 'Late: 2 days', late: { days: 2, perDay: 10 } }, paperIds: [idOf('Noah Park')] })
  r = await t('GET', `/api/grade-batch/${batchId}`)
  const noah = r.json.results.find((x) => x.student_name === 'Noah Park')
  check('a 2-day late penalty replaces the 1-day one (24 - 8 = 16)', noah.adjustments.length === 1 && noah.adjustments[0].id === 'adj-late0002' && Number(noah.total_marks) === 16, JSON.stringify(noah.adjustments))
  await t('PATCH', `/api/grade-batch/${batchId}`, { adjustment: late, paperIds: [idOf('Noah Park')] })
  const s = api(student.session)
  r = await s('PATCH', `/api/grade-batch/${batchId}`, { adjustment: packet, paperIds: [idOf('Noah Park')] })
  check('students cannot add adjustments', r.status === 403 || r.status === 401, `got ${r.status}`)
  r = await t('PATCH', `/api/grade-batch/${batchId}`, { adjustment: { ...packet, amount: -4 }, paperIds: [idOf('Noah Park')] })
  check('a negative amount is refused', r.status === 400)

  console.log('== Browser ==')
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
  await ctx.addCookies(cookiesFor(teacher.session))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/grade-exam/batch/${batchId}`, { waitUntil: 'networkidle' })
  await page.getByText('Extra credit: study guide packet (+10%)').waitFor()
  check('results page lists the adjustments', await page.getByText('Late: 1 day (-10%)').count() === 1)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-results.png`, fullPage: true })

  // Late work for papers graded 1 day later: the dialog picks them itself.
  await page.getByRole('button', { name: /Extra credit \/ points off/ }).click()
  await page.getByRole('radio', { name: 'Late work' }).click()
  check('Late work tab is the selected one', await page.getByRole('radio', { name: 'Late work' }).getAttribute('aria-checked') === 'true' && await page.getByRole('radio', { name: 'Extra credit' }).getAttribute('aria-checked') === 'false')
  await page.getByLabel('Days late').fill('2')
  await page.getByLabel('Days late').fill('1')
  const applyBtn = page.getByRole('button', { name: /Apply to 1 student$/ })
  check('late work picks the paper graded 1 day later', await applyBtn.count() === 1)
  await page.waitForTimeout(400)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-dialog-late.png` })
  await page.getByRole('radio', { name: 'Take off points' }).click()
  await page.getByLabel('Take off').fill('2')
  await page.getByRole('combobox', { name: /Of/ }).selectOption('marks').catch(async () => page.locator('select').last().selectOption('marks'))
  await page.getByPlaceholder(/No name on the paper/).fill('No name on the paper')
  await page.getByRole('button', { name: /Apply to 1 student$/ }).click()
  await page.getByText('No name on the paper (-2 marks)').first().waitFor()
  check('applied from the dialog', true)

  await page.getByRole('button', { name: /Send to gradebook/ }).click()
  await page.getByRole('dialog').getByRole('combobox').first().selectOption('focus')
  const dialogText = await page.getByRole('dialog').innerText()
  check('Focus file has a Comment column', /Student ID\s+Score\s+Comment/.test(dialogText), dialogText.slice(0, 200))
  check('comments list for copying', dialogText.includes('Comments for the gradebook (3)') && dialogText.includes('Late: 1 day (-10%); No name on the paper (-2 marks)'))
  if (SHOTS) await page.getByRole('dialog').screenshot({ path: `${SHOTS}/3-export.png` })
  await page.keyboard.press('Escape')

  await page.goto(`${BASE}/grade-report/${idOf('Sean Miller')}`, { waitUntil: 'networkidle' })
  await page.getByText('Extra credit and points off').waitFor()
  const reportText = await page.locator('body').innerText()
  check('report shows the section, as-graded score and final total', reportText.includes('As graded: 31/40 (77.5%)') && reportText.includes('35/40') && reportText.includes('87.5%'), reportText.slice(0, 300))
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-report.png`, fullPage: true })
  await browser.close()
}

async function cleanup() {
  for (const id of users) await admin.from('grading_results').delete().eq('user_id', id)
  if (classId) await admin.from('classes').delete().eq('id', classId)
  for (const id of users) await admin.auth.admin.deleteUser(id)
}

try { await main() } catch (e) { console.error('Crashed:', e); failures++ } finally {
  await cleanup()
  console.log(failures ? `${failures} failed` : 'all passed')
  process.exit(failures ? 1 : 0)
}

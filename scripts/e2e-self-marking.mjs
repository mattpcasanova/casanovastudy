// "I'll mark them myself": a teacher sets up a class set with a Cambridge-style
// mark scheme (M1 / A1 / B1), nothing is graded, and she clicks the marks on a
// mark sheet beside each paper. Makes a throwaway teacher + class, sorts three
// rendered papers for real and reads the mark scheme once (a few cents of AI),
// then deletes everything. Dev server on :3000:
//   node scripts/e2e-self-marking.mjs [shotsDir]
import { mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const args = process.argv.slice(2)
const OUT = args.find((a) => !a.startsWith('--')) ?? '/tmp/self-marking'
mkdirSync(OUT, { recursive: true })

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const REF = new globalThis.URL(URL_).hostname.split('.')[0]
const created = { userId: null, classId: null }

async function makeTeacher() {
  const email = `e2e-selfmark-teacher-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  created.userId = data.user.id
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: 'teacher', first_name: 'Mo', last_name: 'Bile', birth_date: '1985-03-01' })
  await admin.from('teacher_verifications').upsert({ user_id: data.user.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signin, error: e2 } = await anon.auth.signInWithPassword({ email, password })
  if (e2) throw e2
  return signin.session
}

function cookiesFor(session) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const CHUNK = 3180
  const base = { domain: 'localhost', path: '/', sameSite: 'Lax' }
  if (value.length <= CHUNK) return [{ ...base, name, value }]
  const out = []
  for (let i = 0; i * CHUNK < value.length; i++) out.push({ ...base, name: `${name}.${i}`, value: value.slice(i * CHUNK, (i + 1) * CHUNK) })
  return out
}


let passed = 0, failed = 0
const check = (ok, what) => { if (ok) { passed++; console.log(`  ok   ${what}`) } else { failed++; console.log(`  FAIL ${what}`) } }

// A one-page "handwritten" Cambridge-style paper rendered to PNG.
async function paperPng(browser, name, a1, a2, a3) {
  const p = await browser.newPage({ viewport: { width: 850, height: 1100 } })
  const q = (text) => `<p style="font:21px Arial;color:#000;margin-top:38px">${text}</p>`
  const a = (text) => `<p style="margin:6px 0 0 24px">${text}</p>`
  await p.setContent(`<body style="margin:55px;font:26px 'Bradley Hand','Segoe Script',cursive;color:#1e3a8a;background:#fff">
    <div style="font:21px Arial;color:#000">Name: <span style="font:28px 'Bradley Hand',cursive;color:#1e3a8a">${name}</span> &nbsp;&nbsp; AS Mathematics: Differentiation test &nbsp; Period 3</div>
    ${q('1 (a) Differentiate y = 3x<sup>2</sup> + 2x - 5 with respect to x. [2]')}${a(a1)}
    ${q('1 (b) Find the x-coordinate of the stationary point of the curve. [3]')}${a(a2)}
    ${q('2 State whether the stationary point is a maximum or a minimum, giving a reason. [2]')}${a(a3)}</body>`)
  const buf = await p.screenshot({ type: 'png' })
  await p.close()
  return buf
}

const SCHEME = `AS Mathematics: Differentiation test. Mark scheme. Total 7.
1(a) [2]  dy/dx = 6x + 2.  M1 for attempting to differentiate (power reduced by one on at least one term). A1 for 6x + 2 cao.
1(b) [3]  Sets their dy/dx = 0: M1.  Solves a linear equation for x: M1.  x = -1/3: A1.
2 [2]  d2y/dx2 = 6: B1.  Positive so minimum: B1ft.
`

async function main() {
  const session = await makeTeacher()
  const { data: cls } = await admin.from('classes').insert({ teacher_id: created.userId, name: 'SELF MARK AS Maths', period: '3', enrollment_code: 'S' + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z2-9]/g, 'X') }).select('id').single()
  created.classId = cls.id
  await admin.from('class_roster').insert([['Sean', 'Miller', '1001'], ['Mary Ann', 'Lee', '1002'], ['Ava', 'Kim', '1003']].map(([f, l, n]) => ({ class_id: cls.id, first_name: f, last_name: l, student_number: n })))

  const browser = await chromium.launch()
  const papers = [
    ['Sean Miller', 'dy/dx = 6x + 2', '6x + 2 = 0, x = -1/3', 'second derivative = 6 > 0 so minimum'],
    ['Mary Ann Lee', 'dy/dx = 6x + 2 - 5', '6x - 3 = 0 so x = 1/2', 'maximum'],
    ['Ava Kim', '6x + 2', 'x = -2/6 = -1/3', 'minimum because the curve is U shaped'],
  ]
  const files = []
  for (const [i, [n, ...ans]] of papers.entries()) files.push({ name: `scan_${String(i + 1).padStart(2, '0')}.png`, mimeType: 'image/png', buffer: await paperPng(browser, n, ...ans) })
  const scheme = { name: 'mark scheme.txt', mimeType: 'text/plain', buffer: Buffer.from(SCHEME) }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addCookies(cookiesFor(session))
  const page = await ctx.newPage()
  page.setDefaultTimeout(60000)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const shot = async (step) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${step}.png`, fullPage: true }) }

  console.log('Set up a class set to mark by hand')
  await page.goto(`${BASE}/grade-exam/batch?class=${cls.id}`, { waitUntil: 'networkidle' })
  const inputs = page.locator('input[type="file"]')
  await inputs.nth(0).setInputFiles(files)
  await inputs.nth((await inputs.count()) - 1).setInputFiles([scheme])
  await page.getByRole('button', { name: /Sort into students/ }).click()
  await page.getByRole('button', { name: /^Grade \d+ paper/ }).waitFor()
  check(await page.getByText('Who marks these papers?').count() === 1, 'review screen asks who marks')
  await page.getByRole('radio', { name: /I'll mark them myself/ }).check()
  await shot('1-review-self-mark')
  const setUp = page.getByRole('button', { name: /^Set up 3 papers to mark/ })
  check(await setUp.count() === 1, 'the button becomes "Set up 3 papers to mark"')
  const started = Date.now()
  await setUp.click()
  await page.getByText(/3 of 3 graded/).waitFor({ timeout: 240000 })
  console.log(`  (mark sheet + 3 papers ready in ${Math.round((Date.now() - started) / 1000)} s)`)
  check(await page.getByText(/Ready to mark · 7 marks/).count() === 3, 'each paper is ready to mark out of 7')
  await shot('2-ready')

  const { data: rows } = await admin.from('grading_results').select('id, student_name, total_marks, total_possible_marks, grade_breakdown, ai_breakdown, token_usage, page_urls, roster_id, batch_id').eq('user_id', created.userId).order('student_name')
  check(rows?.length === 3, 'three reports saved')
  const sheet = rows?.[0]?.grade_breakdown ?? []
  console.log('  mark sheet:', JSON.stringify(sheet.map((q) => ({ q: q.questionNumber, marks: q.marksPossible, points: (q.points ?? []).map((p) => p.code), guide: q.guide }))))
  check(sheet.length === 3 && sheet.reduce((s, q) => s + q.marksPossible, 0) === 7, 'mark sheet has 3 questions worth 7')
  check(sheet.every((q) => q.unmarked === true && q.marksAwarded === 0), 'every question waits for a mark')
  check(JSON.stringify(sheet.map((q) => (q.points ?? []).map((p) => p.code))) === JSON.stringify([['M1', 'A1'], ['M1', 'M1', 'A1'], ['B1', 'B1ft']]), "points use the scheme's own codes (M1 A1 / M1 M1 A1 / B1 B1ft)")
  check(rows.every((r) => r.ai_breakdown === null && r.token_usage === null), 'nothing was graded by the model')
  check(rows.every((r) => Array.isArray(r.page_urls) && r.page_urls.length === 1 && r.roster_id), 'pages saved and students linked to the class list')
  const usage = await admin.from('usage_events').select('id', { count: 'exact', head: true }).eq('user_id', created.userId).eq('kind', 'grading')
  check((usage.count ?? 0) === 0, "doesn't count toward the day's graded papers")

  console.log('Mark a paper')
  await page.getByRole('link', { name: /Start marking/ }).click()
  await page.waitForURL(/grade-report\/.+mark=1/)
  await page.getByText("You're marking.").waitFor()
  check(await page.getByText('Not marked yet').count() === 3, 'three questions show "Not marked yet"')
  check(await page.getByRole('img', { name: /page 1/i }).count() + await page.locator('img[src*="token="]').count() > 0, 'the paper is open beside the mark sheet')
  await shot('3-marking-blank')
  const q1 = page.getByRole('group', { name: 'Marks for question 1(a)' })
  await q1.getByRole('button', { name: /^M1/ }).click()
  // Put that mark on the paper itself.
  const sheetImg = page.locator('section[aria-label$="paper"] img[alt^="Page 1 of"]')
  const box = await sheetImg.boundingBox()
  await page.getByText(/Click the paper to put this on question 1\(a\)/).waitFor()
  await sheetImg.click({ position: { x: box.width * 0.6, y: box.height * 0.23 } })
  check(await page.getByRole('button', { name: /^M1 on question 1\(a\)/ }).count() === 1, 'M1 is stamped on the paper where she clicked')
  check(await q1.getByRole('button', { name: /^A0/ }).count() === 1, 'once a question is marked, a mark not clicked reads A0')
  await q1.getByRole('button', { name: /^A0/ }).click()
  const q2 = page.getByRole('group', { name: 'Marks for question 1(b)' })
  await q2.getByRole('button', { name: 'Full marks' }).click()
  await q2.getByRole('button', { name: /^A1/ }).click() // take the accuracy mark back
  await sheetImg.click({ position: { x: box.width * 0.7, y: box.height * 0.3 } })
  check(await page.getByRole('button', { name: /^A0 on question 1\(b\)/ }).count() === 1, 'the lost mark is stamped as A0')
  const q3 = page.getByRole('group', { name: 'Marks for question 2' })
  await q3.getByRole('button', { name: 'None' }).click()
  check(await page.getByText('Not marked yet').count() === 0, 'all three questions are marked')
  check(await q2.getByRole('button', { name: /^A0/ }).count() === 1, 'a lost accuracy mark reads A0')
  check(await page.getByText('4/7').count() >= 1, 'total is 4/7')
  await page.getByText(/All marked · saved/).waitFor()
  await shot('4-marking-done')
  await page.locator('section[aria-label$="paper"]').screenshot({ path: `${OUT}/4b-paper-panel.png` })
  const firstId = page.url().match(/grade-report\/([0-9a-f-]+)/)[1]
  let after = null
  for (let i = 0; i < 20; i++) { // autosave runs 700 ms after the last click
    after = (await admin.from('grading_results').select('total_marks, percentage, grade, grade_breakdown, reviewed_at').eq('id', firstId).single()).data
    if (Number(after.total_marks) === 4) break
    await page.waitForTimeout(500)
  }
  check(Number(after.total_marks) === 4 && after.grade_breakdown.map((q) => q.markCodes).join(' | ') === 'M1 A1 | M1 M1 A0 | B0 B0ft', `saved: 4 marks, codes "${after.grade_breakdown.map((q) => q.markCodes).join(' | ')}"`)
  check(after.grade_breakdown.every((q) => !q.unmarked), 'saved with nothing left to mark')
  const at = after.grade_breakdown[0].points[0].at
  check(at && at.page === 1 && Math.abs(at.x - 0.6) < 0.03 && Math.abs(at.y - 0.23) < 0.03, `the stamp's place is saved (${JSON.stringify(at)})`)
  await page.getByRole('button', { name: /^A0 on question 1\(b\)/ }).click()
  await page.getByRole('button', { name: 'Take it off' }).click()
  check(await page.getByRole('button', { name: /^A0 on question 1\(b\)/ }).count() === 0 && await page.getByRole('button', { name: /^M1 on question 1\(a\)/ }).count() === 1, 'a stamp can be taken off the paper; the mark stays')
  check(await page.getByText('4/7').count() >= 1, 'total still 4/7')
  // A note from the palette (not one of the scheme's marks) on the question last clicked.
  await page.getByRole('button', { name: /Follow through.*\(ft\)/ }).click()
  await page.getByText(/Click the paper to put this on question 2/).waitFor() // the question last clicked
  await sheetImg.click({ position: { x: box.width * 0.5, y: box.height * 0.33 } })
  check(await page.getByRole('button', { name: /^ft on question 2/ }).count() === 1, 'a palette note ("ft") lands on the page')
  check(await page.getByText('4/7').count() >= 1, 'notes change no marks')
  await page.waitForTimeout(1500)

  await page.getByRole('button', { name: /Next paper/ }).click()
  await page.waitForFunction(() => document.querySelectorAll('[role="group"][aria-label^="Marks for question"]').length === 3 && [...document.querySelectorAll('span')].filter((s) => s.textContent === 'Not marked yet').length === 3)
  check(true, 'Next paper opens the next unmarked paper, ready to mark')
  await page.getByRole('group', { name: 'Marks for question 1(a)' }).getByRole('button', { name: /^M1/ }).click()
  await page.getByText(/1 of 3 marked · saved/).waitFor()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.waitForTimeout(1500)
  await shot('5-report-part-marked')

  console.log('Class results')
  await page.goto(`${BASE}/grade-exam/batch/${rows[0].batch_id}`, { waitUntil: 'networkidle' })
  await page.getByText(/waiting for your marks/).waitFor()
  check(await page.getByText('2 papers are waiting for your marks').count() === 1, 'class results: 2 papers waiting')
  check(await page.getByText(/class average 57\.1% \(1 marked\)/).count() === 1, 'the average counts only the marked paper (57.1%)')
  check(await page.getByText('1 of 3 marked').count() >= 1 && await page.getByText('Not marked yet').count() >= 1, 'rows show "1 of 3 marked" and "Not marked yet"')
  await shot('6-class-results')
  const gb = await page.evaluate(async (id) => (await fetch(`/api/classes/${id}/gradebook`)).json(), cls.id)
  const cells = JSON.stringify(gb)
  check((cells.match(/"percentage":/g) ?? cells.match(/"pct":/g) ?? []).length === 1 || /57\.1/.test(cells), 'gradebook only has the marked paper')

  console.log('A student sees the marks, not the answer line')
  const student = await admin.auth.admin.createUser({ email: `e2e-selfmark-student-${Date.now()}@example.com`, password: 'E2eTest!' + Math.random().toString(36).slice(2, 10), email_confirm: true })
  created.studentId = student.data.user.id
  const markedId = page.url() && (await admin.from('grading_results').select('id').eq('user_id', created.userId).eq('total_marks', 4).single()).data.id
  await admin.from('grading_results').update({ student_user_id: created.studentId, released: true }).eq('id', markedId)
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  await admin.auth.admin.updateUserById(created.studentId, { password: 'StudentPass!234' })
  const { data: s2 } = await anon.auth.signInWithPassword({ email: student.data.user.email, password: 'StudentPass!234' })
  const res = await fetch(`${BASE}/api/grade-exam/${markedId}`, { headers: { Authorization: `Bearer ${s2.session.access_token}` } })
  const seen = (await res.json()).data
  check(seen && seen.gradeBreakdown.every((q) => q.guide === undefined) && seen.gradeBreakdown[0].points?.length === 2 && seen.setPapers.length === 0, 'student gets points and marks, no answer line, no classmates')
  check(seen && seen.pages.length === 1 && seen.gradeBreakdown[0].points[0].at && seen.gradeBreakdown[2].notes?.[0]?.text === 'ft', 'the released student gets their marked paper (page, stamps and notes)')
  const unreleased = (await admin.from('grading_results').select('id').eq('user_id', created.userId).neq('id', markedId).limit(1).single()).data.id
  await admin.from('grading_results').update({ student_user_id: created.studentId }).eq('id', unreleased)
  const hidden = await fetch(`${BASE}/api/grade-exam/${unreleased}`, { headers: { Authorization: `Bearer ${s2.session.access_token}` } })
  check(hidden.status === 404, 'an unreleased report stays hidden from the student')

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' / ') : ''}`)
  await browser.close()
}

async function cleanup() {
  if (created.userId) {
    await admin.from('grading_results').delete().eq('user_id', created.userId)
    await admin.from('grading_batches').delete().eq('user_id', created.userId)
    await admin.from('grading_batch_insights').delete().eq('user_id', created.userId)
    // The uploaded test pages.
    const bucket = admin.storage.from('uploads')
    const { data: kinds } = await bucket.list(created.userId, { limit: 100 })
    for (const kind of kinds ?? []) {
      const { data: found } = await bucket.list(`${created.userId}/${kind.name}`, { limit: 1000 })
      const paths = (found ?? []).filter((f) => f.id).map((f) => `${created.userId}/${kind.name}/${f.name}`)
      if (paths.length) await bucket.remove(paths)
    }
  }
  if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
  if (created.studentId) await admin.auth.admin.deleteUser(created.studentId)
  if (created.userId) await admin.auth.admin.deleteUser(created.userId)
}

try {
  await main()
} catch (e) {
  console.error('Crashed:', e)
  process.exitCode = 1
} finally {
  await cleanup()
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed) process.exitCode = 1
  process.exit()
}

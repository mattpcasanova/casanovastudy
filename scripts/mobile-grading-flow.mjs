// Walks the whole class-grading flow on a phone-sized browser (390x844, touch)
// and saves a screenshot of each step, plus layout problems (content wider
// than the screen, text spilling out of or wrapping inside buttons). Makes a
// throwaway teacher + class, renders 3 one-page test papers (one name not on
// the class list), sorts and grades them for real (~$0.10 of AI), then deletes
// everything. Dev server on :3000:
//   node scripts/mobile-grading-flow.mjs <outDir> [--width 390] [--no-grade]
// Steps: 1-6 grade a class (setup, review, grading, class results), 7-9 grade one paper and its report.
import { mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const BASE = 'http://localhost:3000'
const args = process.argv.slice(2)
const OUT = args.find((a) => !a.startsWith('--')) ?? '/tmp/mobile-grading'
const WIDTH = Number(args[args.indexOf('--width') + 1]) || 390
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
  const email = `e2e-mobile-teacher-${Date.now()}@example.com`
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

// A one-page "handwritten" quiz rendered to PNG.
async function paperPng(browser, name, a1, a2) {
  const p = await browser.newPage({ viewport: { width: 850, height: 1100 } })
  await p.setContent(`<body style="margin:60px;font:28px 'Bradley Hand','Segoe Script',cursive;color:#1e3a8a;background:#fff">
    <div style="font:22px Arial;color:#000">Name: <span style="font:30px 'Bradley Hand',cursive;color:#1e3a8a">${name}</span> &nbsp;&nbsp; Unit 2 Quiz &nbsp; Period 3</div>
    <p style="font:22px Arial;color:#000;margin-top:50px">1. A car travels 120 km in 2 hours. What is its average speed? (2 marks)</p><p>${a1}</p>
    <p style="font:22px Arial;color:#000;margin-top:50px">2. Convert 2.5 km to metres. (2 marks)</p><p>${a2}</p></body>`)
  const buf = await p.screenshot({ type: 'png' })
  await p.close()
  return buf
}

async function layoutIssues(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth
    const out = []
    const scrollsSideways = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true } return false }
    const label = (el) => `<${el.tagName.toLowerCase()}> "${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50)}"`
    if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px wide)`)
    const seen = new Set()
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (!r.width || getComputedStyle(el).visibility === 'hidden') continue
      if (r.right > W + 1 && !scrollsSideways(el) && !el.closest('[aria-hidden="true"]')) {
        const key = label(el)
        if (!seen.has(key) && el.children.length < 6) { seen.add(key); out.push(`off screen right by ${Math.round(r.right - W)}px: ${key}`) }
      }
      if (el.matches('button, a[class*="h-9"], a[class*="h-10"], a[class*="h-11"], a[class*="h-12"]')) {
        const cs = getComputedStyle(el)
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3
        if (el.scrollWidth > el.clientWidth + 2 && cs.overflow === 'visible') out.push(`text spills out of ${label(el)}`)
        else if (el.scrollHeight > r.height + 2 && r.height < lh * 2.2) out.push(`text wraps in ${label(el)}`)
      }
    }
    return out.slice(0, 40)
  })
}

async function shot(page, step) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${step}.png`, fullPage: true })
  const issues = await layoutIssues(page)
  console.log(`${step}: ${issues.length ? '' : 'no layout problems'}`)
  for (const i of issues) console.log(`    ${i}`)
}

async function main() {
  const session = await makeTeacher()
  const { data: cls } = await admin.from('classes').insert({ teacher_id: created.userId, name: 'MOBILE CHECK Physics', period: '3', enrollment_code: 'M' + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z2-9]/g, 'X') }).select('id').single()
  created.classId = cls.id
  await admin.from('class_roster').insert([['Sean', 'Miller', '1001'], ['Mary Ann', 'Lee', '1002'], ['Ava', 'Kim', '1003'], ['Noah', 'Park', '1004']].map(([f, l, n]) => ({ class_id: cls.id, first_name: f, last_name: l, student_number: n })))

  const browser = await chromium.launch()
  const papers = [
    ['Sean Miller', '120 / 2 = 60 km/h', '2.5 x 1000 = 2500 m'],
    ['Mary Ann Lee', '60 km/h', '250 m'],
    ['Brandon Okafor', 'speed = 240', '2500 metres'],
  ]
  const files = []
  for (const [i, [n, a, b]] of papers.entries()) files.push({ name: `scan_${String(i + 1).padStart(2, '0')}.png`, mimeType: 'image/png', buffer: await paperPng(browser, n, a, b) })
  const scheme = { name: 'mark scheme.txt', mimeType: 'text/plain', buffer: Buffer.from('Q1 (2): 60 km/h. M1 for 120/2, A1 for 60 km/h with units.\nQ2 (2): 2500 m. M1 for x1000, A1 for 2500 m.\n') }

  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.addCookies(cookiesFor(session))
  const page = await ctx.newPage()
  page.setDefaultTimeout(240000)
  await page.goto(`${BASE}/grade-exam/batch?class=${cls.id}`, { waitUntil: 'networkidle' })
  await shot(page, '1-setup')
  const inputs = page.locator('input[type="file"]')
  await inputs.nth(0).setInputFiles(files)
  await inputs.nth((await inputs.count()) - 1).setInputFiles([scheme])
  await shot(page, '2-files-added')
  await page.getByRole('button', { name: /Sort into students/ }).click()
  await page.getByRole('button', { name: /^Grade \d+ paper/ }).waitFor()
  await shot(page, '3-review')
  if (args.includes('--no-grade')) return
  await page.getByRole('button', { name: /^Grade \d+ paper/ }).click()
  await page.waitForTimeout(4000)
  await shot(page, '4-grading')
  await page.getByText(/3 of 3 graded/).waitFor({ timeout: 300000 })
  await shot(page, '5-graded')
  const results = page.getByRole('link', { name: /class results/i }).first()
  if (await results.count()) { await results.click(); await page.getByText(/class average/).first().waitFor(); await shot(page, '6-class-results') }

  // One paper at a time: the streaming grader, then its report.
  await page.goto(`${BASE}/grade-exam`, { waitUntil: 'networkidle' })
  await shot(page, '7-single-setup')
  const single = page.locator('input[type="file"]')
  await single.nth(0).setInputFiles([files[0]])
  await single.nth((await single.count()) - 1).setInputFiles([scheme])
  await page.getByRole('button', { name: /^Grade exam/ }).click()
  await page.waitForTimeout(8000)
  await shot(page, '8-single-grading')
  await page.waitForURL(/grade-report/, { timeout: 300000 })
  await page.getByText(/Question breakdown/i).first().waitFor()
  await shot(page, '9-report')
  await browser.close()
}

async function cleanup() {
  if (created.userId) {
    await admin.from('grading_results').delete().eq('user_id', created.userId)
    await admin.from('grading_batches').delete().eq('user_id', created.userId)
    await admin.from('grading_batch_insights').delete().eq('user_id', created.userId)
  }
  if (created.classId) await admin.from('classes').delete().eq('id', created.classId)
  if (created.userId) await admin.auth.admin.deleteUser(created.userId)
}

try {
  await main()
} catch (e) {
  console.error('Crashed:', e)
  process.exitCode = 1
} finally {
  await cleanup()
  process.exit()
}

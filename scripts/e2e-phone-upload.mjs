// Send from your phone, end to end against the dev server (:3000): a throwaway
// teacher makes a QR link, a phone-sized browser opens it, adds 3 photo pages
// and a 2-page PDF, sends them, and the teacher's laptop side finds 5 pages in
// the inbox. Also checks a bad token, a forged path and expiry. Cleans up.
//   node scripts/e2e-phone-upload.mjs [shotsDir]
import { mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const { PDFDocument, StandardFonts } = require('pdf-lib')
const BASE = 'http://localhost:3000'
const SHOTS = process.argv[2]
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let userId = null
let failures = 0
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++ }

async function main() {
  const email = `e2e-phone-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  userId = u.user.id
  await admin.from('user_profiles').insert({ id: userId, email, user_type: 'teacher', first_name: 'Pat', last_name: 'Phone', birth_date: '1980-01-01' })
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  const auth = { Authorization: `Bearer ${s.session.access_token}` }

  const link = await (await fetch(`${BASE}/api/phone-upload`, { method: 'POST', headers: auth })).json()
  check(/\/phone\/[A-Za-z0-9_-]{32}$/.test(link.url ?? ''), 'teacher gets a phone link')
  const token = link.url.split('/').pop()
  const status = async () => (await fetch(`${BASE}/api/phone-upload?session=${link.sessionId}`, { headers: auth })).json()
  check((await status()).opened === false, 'not opened yet')
  check((await fetch(`${BASE}/api/phone-upload/${'x'.repeat(32)}`)).status === 410, 'unknown token refused')

  // Test files: 3 photos and a 2-page PDF.
  const browser = await chromium.launch()
  const maker = await browser.newPage({ viewport: { width: 850, height: 1100 } })
  const photos = []
  for (const n of [3, 1, 2]) {
    await maker.setContent(`<body style="margin:60px;font:30px Arial">Name: Student ${n}<p>1. 2 + 2 = 4</p></body>`)
    photos.push({ name: `IMG_100${n}.JPG`, mimeType: 'image/jpeg', buffer: await maker.screenshot({ type: 'jpeg' }) })
  }
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const p of [1, 2]) doc.addPage([612, 792]).drawText(`Scanned page ${p}`, { x: 72, y: 700, size: 24, font })
  const pdf = { name: 'Scanned Documents.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' })
  const phone = await ctx.newPage()
  await phone.goto(`${BASE}/phone/${token}`, { waitUntil: 'networkidle' })
  await phone.getByRole('heading', { name: /Send pages to your computer/ }).waitFor()
  check(await phone.getByText('Already scanned them in Notes?').count() === 1, 'iPhone sees the Notes tip')
  if (SHOTS) await phone.screenshot({ path: `${SHOTS}/1-phone-open.png`, fullPage: true })
  check((await status()).opened === true, 'laptop sees the phone connected')

  const picker = phone.locator('input[type="file"][multiple]')
  await picker.setInputFiles(photos)
  await phone.getByText('3 pages ready').waitFor()
  await picker.setInputFiles([pdf])
  await phone.getByText('5 pages ready').waitFor({ timeout: 60000 })
  if (SHOTS) await phone.screenshot({ path: `${SHOTS}/2-phone-ready.png`, fullPage: true })
  await phone.getByRole('button', { name: /Send 5 pages/ }).click()
  await phone.getByText(/Sent 5 pages/).waitFor({ timeout: 60000 })
  if (SHOTS) await phone.screenshot({ path: `${SHOTS}/3-phone-sent.png`, fullPage: true })
  check(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone page fits the screen')

  const st = await status()
  check(st.items.length === 1 && st.items[0].pages === 5, `laptop sees 1 send of 5 pages (${JSON.stringify(st.items)})`)
  const files = await (await fetch(`${BASE}/api/scan-inbox/${st.items[0].id}`, { headers: auth })).json()
  check(files.files.map((f) => f.name).join(',') === 'Phone 1-001.jpg,Phone 1-002.jpg,Phone 1-003.jpg,Phone 1-004.jpg,Phone 1-005.jpg', 'pages named in phone order')
  const first = await fetch(files.files[0].url)
  const bytes = Buffer.from(await first.arrayBuffer())
  check(first.ok && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.length < 1.5 * 1024 * 1024, `first page is a small JPEG (${Math.round(bytes.length / 1024)} KB)`)

  // A forged path (another teacher's folder) is refused.
  const forged = await fetch(`${BASE}/api/phone-upload/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'done', send: 2, files: [{ path: `someone-else/phone/${link.sessionId}/2-001.jpg`, contentType: 'image/jpeg' }] }) })
  check(forged.status === 400, 'forged path refused')
  const html = await fetch(`${BASE}/api/phone-upload/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sign', send: 2, files: [{ contentType: 'text/html', size: 10 }] }) })
  check(html.status === 400, 'non-image refused')

  // Expired links stop working.
  await admin.from('phone_upload_sessions').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', link.sessionId)
  check((await fetch(`${BASE}/api/phone-upload/${token}`)).status === 410, 'expired link refused')
  await phone.reload({ waitUntil: 'networkidle' })
  await phone.getByText('This code has expired').waitFor()
  check(true, 'phone shows the expired message')
  await browser.close()
}

async function cleanup() {
  if (!userId) return
  const { data: items } = await admin.from('scan_inbox_items').select('files').eq('user_id', userId)
  const paths = (items ?? []).flatMap((r) => r.files.map((f) => f.path))
  const { data: sessions } = await admin.from('phone_upload_sessions').select('id').eq('user_id', userId)
  for (const s of sessions ?? []) {
    const { data: stored } = await admin.storage.from('scan-inbox').list(`${userId}/phone/${s.id}`)
    paths.push(...(stored ?? []).map((o) => `${userId}/phone/${s.id}/${o.name}`))
  }
  if (paths.length) await admin.storage.from('scan-inbox').remove([...new Set(paths)])
  await admin.auth.admin.deleteUser(userId)
}

try { await main() } catch (e) { console.error('Crashed:', e); failures++ } finally {
  await cleanup()
  console.log(failures ? `${failures} failed` : 'all passed')
  process.exit(failures ? 1 : 0)
}

// Looks at real teacher pages as one account, read only: signs a headless
// browser in as that user (a one-time sign-in link made with the service role;
// no email is sent, no password is needed or changed) and screenshots the
// teacher home, progress, the newest class sets and assigned practice.
// Only for the account owner's own request: the screenshots show real student
// names and scores, so keep them off shared drives.
//   node scripts/view-as.mjs <email or profile id> <outDir> [--mobile]   (dev server on :3000)
// The account must already exist: a sign-in link for an unknown email CREATES
// an account (this happened once, 2026-11-10), so the profile is looked up first.
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'fs'

const [who, out] = process.argv.slice(2)
if (!who || !out) throw new Error('usage: view-as.mjs <email or profile id> <outDir> [--mobile]')
const mobile = process.argv.includes('--mobile')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]))
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const REF = new URL(URL_).hostname.split('.')[0]
const BASE = process.env.BASE_URL || 'http://localhost:3000'
mkdirSync(out, { recursive: true })

const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: profile } = await admin.from('user_profiles').select('id, email, user_type').eq(who.includes('@') ? 'email' : 'id', who).maybeSingle()
if (!profile?.email) throw new Error('No account found for that email or id. Nothing was created.')
const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: profile.email })
if (error) throw error
const { data: signin, error: e2 } = await anon.auth.verifyOtp({ type: 'email', token_hash: link.properties.hashed_token })
if (e2) throw e2
const session = signin.session
if (session.user.id !== profile.id) throw new Error('Signed in as a different user than the profile: stopping.')
const student = profile.user_type !== 'teacher'

function cookiesFor() {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const base = { domain: 'localhost', path: '/', sameSite: 'Lax' }
  const out = []
  for (let i = 0; i * 3180 < value.length; i++) out.push({ ...base, name: value.length <= 3180 ? name : `${name}.${i}`, value: value.slice(i * 3180, (i + 1) * 3180) })
  return out
}
const get = async (path) => { const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${session.access_token}` } }); return r.ok ? r.json() : null }

const home = student ? null : await get('/api/teacher/home')
const progress = student ? null : await get('/api/teacher/progress')
const sets = (home?.recent ?? []).filter((s) => s.papers >= 5).slice(0, 2)
const practice = (home?.practice ?? []).filter((p) => p.done > 0).slice(0, 1)
const course = (progress?.courses ?? [])[0]
const pages = student ? [['progress', '/progress'], ['my-class', '/my-class'], ['home', '/']] : [
  ['teach', '/teach'],
  ['progress', '/teacher/progress'],
  ...(course ? [['course', `/teacher/progress/${encodeURIComponent(course.key)}`]] : []),
  ...sets.map((s, i) => [`results-${i + 1}`, `/grade-exam/batch/${s.batchId}`]),
  ...practice.map((p) => ['practice', `/teacher/practice/${p.id}`]),
]

const browser = await chromium.launch()
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1366, height: 900 } })
await ctx.addCookies(cookiesFor())
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
for (const [name, path] of pages) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${out}/${name}${mobile ? '-m' : ''}.png`, fullPage: true })
  console.log(`${name.padEnd(12)} ${path}`)
}
// The practice page's filters: press each one that exists and capture it.
if (practice.length) {
  for (const label of ['Turned in', 'Not started']) {
    const b = page.getByRole('button', { name: new RegExp(`^${label}`) }).first()
    if (await b.count()) { await b.click(); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/practice-${label.toLowerCase().replace(/ /g, '-')}${mobile ? '-m' : ''}.png`, fullPage: true }); console.log(`practice filter: ${label}`) }
  }
}
// The language dialog on a long class list: the list must scroll inside the dialog (opened, never saved).
if (practice.length) {
  const b = page.getByRole('button', { name: /Another language|Change languages/ }).first()
  if (await b.count()) {
    await b.click(); await page.waitForTimeout(700)
    await page.screenshot({ path: `${out}/practice-language${mobile ? '-m' : ''}.png` })
    await page.keyboard.press('Escape')
    console.log('practice language dialog')
  }
}
console.log(`page errors: ${errors.length} ${errors.slice(0, 2).join(' | ')}`)
await browser.close()

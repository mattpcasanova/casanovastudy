// Editing guides, standards, copies in another language and the assign bar
// (2026-11-05), end to end against the dev server (:3000, or E2E_BASE).
// Three small real AI calls (one rewrite, one translation, one short quiz
// written to a standard: about $0.15). Creates throwaway users and deletes them.
//   node scripts/e2e-guide-edit.mjs [shotsDir] [--no-ai]
import { mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const BASE = process.env.E2E_BASE || 'http://localhost:3000'
const args = process.argv.slice(2)
const NO_AI = args.includes('--no-ai')
const SHOTS = args.find((a) => !a.startsWith('--'))
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
  const email = `e2e-edit-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  const password = 'E2e-pass-' + Math.random().toString(36).slice(2)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: type, first_name: first, last_name: 'Edit', birth_date: '1980-01-01' })
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

const QUIZ = `# Solving Linear Equations

## One-Step and Two-Step

MC_QUESTION: What is the solution of 2x + 6 = 14?
A) x = 2
B) x = 4
C) x = 8
D) x = 10
Correct Answer: B
Hint: What would you undo first?
Explanation: Subtract 6 from both sides to get 2x = 8, then divide by 2.

TF_QUESTION: The equation x + 5 = 5 has the solution x = 0.
Answer: True
Explanation: Subtracting 5 from both sides leaves x = 0.

## Multi-Step

MC_QUESTION: What is the solution of 3(x - 2) = 12?
A) x = 2
B) x = 4
C) x = 6
D) x = 10
Correct Answer: C
Explanation: Divide both sides by 3 to get x - 2 = 4, so x = 6.

NUM_QUESTION: Solve 5x - 3 = 2x + 9. What is x?
Answer: 4
Explanation: Subtract 2x and add 3 to get 3x = 12.
`

async function main() {
  const teacher = await makeUser('teacher', 'Tara')
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const other = await makeUser('teacher', 'Omar')
  const t = api(teacher.session), o = api(other.session)

  const mk = async (title, extra = {}) => (await admin.from('study_guides').insert({ user_id: teacher.id, title, subject: 'mathematics', grade_level: '6th-8th', format: 'quiz', content: QUIZ, file_count: 0, ...extra }).select('id').single()).data
  const guide = await mk('Solving Linear Equations', { standards: 'MA.8.AR.2.1' })
  const read = async (id) => (await admin.from('study_guides').select('*').eq('id', id).single()).data

  console.log('== Editing through the API ==')
  let r = await t('GET', `/api/study-guides/${guide.id}/edit`)
  check('owner can open the editor; an unassigned guide is not locked', r.status === 200 && r.json.locked === false, JSON.stringify(r.json))
  r = await o('GET', `/api/study-guides/${guide.id}/edit`)
  check('someone else cannot', r.status === 403)
  r = await o('PATCH', `/api/study-guides/${guide.id}/edit`, { title: 'Hacked' })
  check('and cannot save changes to it', r.status === 403 && (await read(guide.id)).title === 'Solving Linear Equations')
  r = await fetch(`${BASE}/api/study-guides/${guide.id}/edit`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'x' }) })
  check('signed out is refused', r.status === 401)

  const reworded = QUIZ.replace('What is the solution of 2x + 6 = 14?', 'Solve for x: 2x + 6 = 14.').replace('Correct Answer: C', 'Correct Answer: C')
  r = await t('PATCH', `/api/study-guides/${guide.id}/edit`, { title: '  Linear Equations Check  ', standards: 'MA.8.AR.2.1,  MA.8.AR.2.2 ', content: reworded })
  let g = await read(guide.id)
  check('wording, name and standards save', r.status === 200 && g.title === 'Linear Equations Check' && g.standards === 'MA.8.AR.2.1, MA.8.AR.2.2' && g.content.includes('Solve for x: 2x + 6 = 14.'), JSON.stringify(r.json))
  r = await t('PATCH', `/api/study-guides/${guide.id}/edit`, { content: reworded.replace('Correct Answer: B', 'Correct Answer: F') })
  check('a key that is not one of the options is refused', r.status === 400 && /correct answer/.test(r.json?.error || ''), JSON.stringify(r.json))
  r = await t('PATCH', `/api/study-guides/${guide.id}/edit`, { title: '   ' })
  check('an empty name is refused', r.status === 400)
  const dropTf = reworded.replace(/TF_QUESTION:[\s\S]*?leaves x = 0\.\n\n/, '')
  r = await t('PATCH', `/api/study-guides/${guide.id}/edit`, { content: dropTf })
  check('a question can be removed while the quiz is not assigned', r.status === 200 && !(await read(guide.id)).content.includes('TF_QUESTION'))
  r = await t('PATCH', `/api/study-guides/${guide.id}/edit`, { standards: '' })
  check('standards can be cleared', r.status === 200 && (await read(guide.id)).standards === null)
  await t('PATCH', `/api/study-guides/${guide.id}/edit`, { standards: 'MA.8.AR.2.1: Solve multi-step linear equations in one variable.' })

  console.log('\n== Assigned guides and the assign bar ==')
  const mkClass = async (name, period) => { const { data } = await admin.from('classes').insert({ teacher_id: teacher.id, name, period, enrollment_code: 'E' + Math.random().toString(36).slice(2, 7).toUpperCase() }).select('id').single(); classes.push(data.id); return data.id }
  const c5 = await mkClass('Pre-Algebra', '5'), c2 = await mkClass('Pre-Algebra', '2'), c7 = await mkClass('Algebra 1 Honors', '7')
  const rosterFor = async (classId, n) => (await admin.from('class_roster').insert(Array.from({ length: n }, (_, i) => ({ class_id: classId, first_name: `Student${i + 1}`, last_name: 'Edit' }))).select('id')).data.map((x) => x.id)
  const due = new Date(Date.now() + 3 * 86400000).toISOString()
  for (const [cid, n] of [[c5, 4], [c2, 3], [c7, 2]]) {
    r = await t('POST', '/api/practice-assignments', { guideId: guide.id, classId: cid, rosterIds: await rosterFor(cid, n), dueAt: cid === c2 ? due : undefined })
    if (r.status !== 200) check('assigning works', false, JSON.stringify(r.json))
  }
  r = await t('GET', `/api/practice-assignments?guideId=${guide.id}`)
  const listed = r.json?.assignments ?? []
  check('each assignment comes back with its class name and period', listed.length === 3 && listed.every((a) => a.className && a.period) && listed.some((a) => a.className === 'Algebra 1 Honors' && a.period === '7'), JSON.stringify(listed.map((a) => [a.className, a.period])))
  r = await t('GET', `/api/study-guides/${guide.id}/edit`)
  check('an assigned guide is locked', r.json?.locked === true)
  const now = (await read(guide.id)).content
  r = await t('PATCH', `/api/study-guides/${guide.id}/edit`, { content: now.replace(/NUM_QUESTION:[\s\S]*$/, '') })
  check('removing a question from an assigned quiz is refused', r.status === 400 && /assigned to students/.test(r.json?.error || ''), JSON.stringify(r.json))
  r = await t('PATCH', `/api/study-guides/${guide.id}/edit`, { content: now.replace('Solve 5x - 3 = 2x + 9. What is x?', 'Solve 5x - 3 = 2x + 9 for x.') })
  check('but its wording can still change', r.status === 200 && (await read(guide.id)).content.includes('for x.'))

  if (!NO_AI) {
    console.log('\n== Change it for me, copy in another language, a quiz written to a standard (real AI calls) ==')
    const piece = `MC_QUESTION: What is the solution of 3(x - 2) = 12?\nA) x = 2\nB) x = 4\nC) x = 6\nD) x = 10\nCorrect Answer: C\nExplanation: Divide both sides by 3 to get x - 2 = 4, so x = 6.`
    r = await t('POST', `/api/study-guides/${guide.id}/edit`, { piece, instruction: 'Turn it into a word problem about buying movie tickets, same equation.' })
    const p = r.json?.piece || ''
    check('"Change it for me" returns one question with the same markers and four options', r.status === 200 && /^MC_QUESTION:/.test(p) && (p.match(/^[A-D]\) /gm) || []).length === 4 && /Correct Answer: [A-D]/.test(p) && /ticket/i.test(p), p.slice(0, 300) || JSON.stringify(r.json))
    console.log('   ' + p.split('\n')[0].slice(0, 160))
    r = await o('POST', `/api/study-guides/${guide.id}/edit`, { piece, instruction: 'make it easier' })
    check('not on someone else\'s guide', r.status === 403)

    const started = Date.now()
    r = await t('POST', `/api/study-guides/${guide.id}/translate`, { language: 'es' })
    check(`a Spanish copy is made (${Math.round((Date.now() - started) / 1000)} s)`, r.status === 200 && !!r.json?.studyGuideId, JSON.stringify(r.json))
    if (r.json?.studyGuideId) {
      const es = await read(r.json.studyGuideId)
      const kinds = (c) => (c.match(/^(?:MC|TF|SA|NUM)_QUESTION:/gm) || []).join()
      const keys = (c) => (c.match(/^(?:Correct Answer|Answer):.*$/gm) || []).join('|')
      check('same questions in the same order with the same keys', kinds(es.content) === kinds((await read(guide.id)).content) && keys(es.content) === keys((await read(guide.id)).content), `${keys(es.content)}`)
      check('saved as its own Spanish guide with the standards, not as a copy of the original', es.language === 'es' && es.user_id === teacher.id && !es.copied_from && es.standards?.startsWith('MA.8.AR.2.1') && es.title !== 'Linear Equations Check', JSON.stringify({ l: es.language, t: es.title, s: es.standards }))
      check('and it reads as Spanish', /ecuaci|soluci|resuelve|cuál/i.test(es.content), es.content.slice(0, 200))
      console.log('   ' + es.title + ' | ' + es.content.split('\n').find((l) => l.startsWith('MC_QUESTION')).slice(0, 120))
      r = await t('GET', `/api/study-guides/${guide.id}/edit`)
      const orig = await read(guide.id)
      check('the original is untouched', orig.language === 'en' && orig.title === 'Linear Equations Check')
    }
    r = await t('POST', `/api/study-guides/${guide.id}/translate`, { language: 'en' })
    check('asking for the language it is already in is refused', r.status === 400)
    r = await o('POST', `/api/study-guides/${guide.id}/translate`, { language: 'es' })
    check('someone else cannot copy it', r.status === 403)

    // A short quiz written to a standard, through the real stream route.
    const res = await fetch(`${BASE}/api/generate-study-guide-stream`, { method: 'POST', headers: { Authorization: `Bearer ${teacher.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
      studyGuideName: 'Proportional relationships', subject: 'mathematics', gradeLevel: '6th-8th', format: 'quiz', length: 'short', visuals: false,
      studyRequest: 'Proportional relationships', standards: 'MA.7.AR.4.1: Determine whether two quantities have a proportional relationship by examining a table, graph or written description.',
    }) })
    const text = await res.text()
    const done = text.split('\n').filter((l) => l.startsWith('data: ')).map((l) => { try { return JSON.parse(l.slice(6)) } catch { return null } }).find((e) => e?.type === 'complete' || e?.studyGuideId || e?.id)
    const { data: made } = await admin.from('study_guides').select('id, standards, content').eq('user_id', teacher.id).eq('title', 'Proportional relationships').maybeSingle()
    check('a guide made with standards saves them', res.status === 200 && made?.standards?.startsWith('MA.7.AR.4.1'), text.slice(-300))
    if (made) {
      check('and the guide does not print the code itself', !/MA\.7\.AR\.4\.1/.test(made.content))
      const qs = made.content.split('\n').filter((l) => /_QUESTION:/.test(l))
      console.log(`   ${qs.length} questions, e.g. ${qs[0]?.slice(0, 150)}`)
      check('its questions are about telling whether a relationship is proportional', qs.filter((l) => /proportional/i.test(l)).length >= Math.ceil(qs.length / 2), qs.join(' | ').slice(0, 400))
    }
    void done
  }

  console.log('\n== In the browser ==')
  const b = await chromium.launch()
  for (const [name, width, height] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width, height } })
    await ctx.addCookies(cookiesFor(teacher.session))
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${BASE}/study-guide/${guide.id}`)
    await page.waitForSelector('text=Assigned to 3 classes', { timeout: 60000 })
    const cards = await page.locator('a[href^="/teacher/practice/"]').allTextContents()
    check(`${name}: the assign bar has a card per class, in period order`, cards.length === 3 && /Period\s*2/.test(cards[0]) && /Period\s*5/.test(cards[1]) && /Period\s*7.*Algebra 1 Honors/.test(cards[2]) && /0 of 3 done/.test(cards[0]) && /due/.test(cards[0]), JSON.stringify(cards))
    check(`${name}: the guide shows its standard`, (await page.locator('text=MA.8.AR.2.1').count()) > 0 && (await page.locator('text=Solve multi-step linear equations in one variable.').count()) > 0)
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    check(`${name}: nothing is wider than the screen`, !wide)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/guide-${name}.png` })
    await page.getByRole('button', { name: 'Open guide menu' }).click()
    check(`${name}: the menu offers Edit guide and Copy in another language`, (await page.getByRole('link', { name: 'Edit guide' }).count()) === 1 && (await page.getByRole('button', { name: 'Copy in another language' }).count()) === 1)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/menu-${name}.png` })
    await page.getByRole('button', { name: 'Copy in another language' }).click()
    await page.waitForSelector('text=Español (Spanish)')
    check(`${name}: the language dialog lists the other languages, not English`, (await page.getByRole('button', { name: /^English$/ }).count()) === 0 && (await page.getByRole('button', { name: /Haitian Creole/ }).count()) === 1)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/translate-${name}.png` })

    await page.goto(`${BASE}/study-guide/${guide.id}/edit`)
    await page.waitForSelector('text=This one is assigned to students', { timeout: 60000 })
    check(`${name}: the editor says the quiz is assigned and offers no Remove on questions`, (await page.getByRole('button', { name: /^Remove Question/ }).count()) === 0 && (await page.getByRole('button', { name: /^Remove Topic heading/ }).count()) === 2)
    check(`${name}: the save button waits for a change`, await page.getByRole('button', { name: 'Save changes' }).isDisabled())
    if (name === 'desktop') {
      const q = page.getByLabel('Multiple choice question').first()
      await q.fill('Solve for x: 2x + 6 = 14')
      await page.getByRole('radiogroup', { name: 'Correct answer' }).first().getByRole('radio', { name: 'D' }).click()
      await page.getByLabel('Option D').first().fill('x = 4 (checked)')
      await page.getByLabel('Option B').first().fill('x = 3')
      await page.waitForSelector('text=Unsaved changes')
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/edit-${name}.png`, fullPage: true })
      await page.getByRole('button', { name: 'Save changes' }).click()
      await page.waitForURL(new RegExp(`/study-guide/${guide.id}$`), { timeout: 30000 })
      const saved = (await read(guide.id)).content
      check('desktop: edits made in the page are saved (question, option text, new key)', saved.includes('MC_QUESTION: Solve for x: 2x + 6 = 14\n') && saved.includes('D) x = 4 (checked)') && saved.includes('B) x = 3') && /x = 4 \(checked\)\nCorrect Answer: D/.test(saved), saved.slice(0, 400))
    } else if (SHOTS) await page.screenshot({ path: `${SHOTS}/edit-${name}.png`, fullPage: true })
    check(`${name}: no page errors`, errors.length === 0, errors.join(' | '))
    await ctx.close()
  }

  // The homepage form has the standards box under More options.
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addCookies(cookiesFor(teacher.session))
  const home = await ctx.newPage()
  await home.goto(`${BASE}/?new=1`)
  await home.getByRole('button', { name: 'More options' }).click({ timeout: 60000 })
  await home.getByLabel(/^Standards/).fill('MA.8.AR.2.1')
  check('the guide maker has a Standards box under More options', (await home.getByLabel(/^Standards/).inputValue()) === 'MA.8.AR.2.1')
  if (SHOTS) { await home.getByLabel(/^Standards/).scrollIntoViewIfNeeded(); await home.screenshot({ path: `${SHOTS}/home-standards.png` }) }
  await b.close()
}

main().catch((e) => { console.error(e); failures++ }).finally(async () => {
  for (const id of classes) await admin.from('classes').delete().eq('id', id)
  await admin.from('study_guides').delete().in('user_id', users)
  for (const id of users) await admin.auth.admin.deleteUser(id)
  console.log(failures ? `\n${failures} failed` : '\nall passed')
  process.exit(failures ? 1 : 0)
})

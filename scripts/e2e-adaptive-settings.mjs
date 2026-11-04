// Teacher settings on assigned adaptive practice (2026-11-04), end to end
// against the dev server (:3000, or E2E_BASE): mastery level, questions per
// topic (the bank is filled up to it: two real, small AI calls, about $0.02),
// the explain question, the time estimate, and a student session that runs on
// those rules and turns itself in.
// Creates throwaway users and deletes them.   node scripts/e2e-adaptive-settings.mjs [shotsDir]
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
  const email = `e2e-adaptive-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  const password = 'E2e-pass-' + Math.random().toString(36).slice(2)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: type, first_name: first, last_name: 'Adapt', birth_date: type === 'teacher' ? '1980-01-01' : '2009-01-01' })
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

// Two topics, four true/false questions each (all True, so the test can answer right or wrong at will) and an explain question.
const concept = (name, facts) => `CONCEPT: ${name}
LESSON: ${name} in one line. The usual mistake is mixing up the two parts.
TRAP: t1 | Mixes up the two parts
TRAP: t2 | Forgets the unit

${facts.map((f, i) => `Q: ${[1, 2, 2, 3][i]} | tf
${f}
ANSWER: True
PROBES: ${i % 2 ? 't2' : 't1'}
HINT: Think about the definition.
EXPLANATION: That is the definition.`).join('\n\n')}

Q: 3 | explain
Explain ${name.toLowerCase()} in your own words.
ANSWER: A full answer names both parts and how they relate.
`
const BANK = `# Cell energy
*Adaptive practice on respiration and photosynthesis.*

${concept('Cellular respiration', ['Respiration releases energy from glucose.', 'Mitochondria carry out aerobic respiration.', 'Respiration produces carbon dioxide.', 'ATP is the cell\'s energy carrier.'])}
${concept('Photosynthesis', ['Photosynthesis stores light energy in glucose.', 'Chloroplasts carry out photosynthesis.', 'Photosynthesis releases oxygen.', 'Plants take in carbon dioxide for photosynthesis.'])}`

const graded = (content, k) => {
  // Graded questions per concept, counted the way the parser does: Q blocks under CONCEPT/MORE/REFILL markers.
  let concept = 0, n = 0
  for (const line of content.split('\n')) {
    if (/^CONCEPT:/.test(line)) concept++
    const m = line.match(/^(?:MORE|REFILL):\s*k(\d+)/)
    if (m) concept = Number(m[1])
    if (/^Q:\s*\d\s*\|\s*(mc|tf|num)/.test(line) && concept === k) n++
  }
  return n
}

async function main() {
  const teacher = await makeUser('teacher', 'Tara')
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const stu = await makeUser('student', 'Sofia')
  const t = api(teacher.session), s = api(stu.session)

  const { data: cls } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'E2E Bio', period: '3', enrollment_code: 'A' + Math.random().toString(36).slice(2, 7).toUpperCase() }).select('id').single()
  classes.push(cls.id)
  const { data: roster } = await admin.from('class_roster').insert([{ class_id: cls.id, first_name: 'Sofia', last_name: 'Adapt', email: stu.email, student_user_id: stu.id, linked_via: 'email' }]).select('id')
  const mk = async (title) => (await admin.from('study_guides').insert({ user_id: teacher.id, title, subject: 'biology', grade_level: '9th', format: 'adaptive', content: BANK, file_count: 0 }).select('id').single()).data
  const guide = await mk('Cell energy')
  const plain = await mk('Cell energy (as written)')

  console.log('== Settings through the API ==')
  let r = await t('POST', '/api/practice-assignments', { guideId: plain.id, classId: cls.id, rosterIds: [roster[0].id] })
  check('an assignment with no settings keeps the old defaults (nulls, explain on)', r.status === 200 && r.json.assignment.mastery_pct === null && r.json.assignment.questions_per_concept === null && r.json.assignment.explain_questions === true, JSON.stringify(r.json).slice(0, 300))
  const legacy = r.json.assignment
  r = await s('GET', `/api/practice-assignments/${legacy.id}/me`)
  check('and the student gets empty settings', r.json?.adaptive?.masteryPct === null && r.json?.adaptive?.perConcept === null && r.json?.adaptive?.explain === true, JSON.stringify(r.json?.adaptive))

  r = await t('POST', '/api/practice-assignments', { guideId: guide.id, classId: cls.id, rosterIds: [roster[0].id], masteryPct: 60, questionsPerConcept: 4, explainQuestions: false })
  check('teacher assigns with 60% mastery, 4 per topic, explain off', r.status === 200 && r.json.assignment.mastery_pct === 60 && r.json.assignment.questions_per_concept === 4 && r.json.assignment.explain_questions === false, JSON.stringify(r.json).slice(0, 300))
  const asg = r.json.assignment
  let { data: g } = await admin.from('study_guides').select('content').eq('id', guide.id).single()
  check('4 per topic needs no new questions', !/^MORE:/m.test(g.content))
  r = await s('GET', `/api/practice-assignments/${asg.id}/me`)
  check('student gets the settings on /me', r.json?.adaptive?.masteryPct === 60 && r.json?.adaptive?.perConcept === 4 && r.json?.adaptive?.explain === false, JSON.stringify(r.json?.adaptive))

  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { masteryPct: 250 })
  r = await t('GET', `/api/practice-assignments/${asg.id}`)
  check('an out-of-range mastery level falls back to the default', r.json?.assignment?.mastery_pct === null, String(r.json?.assignment?.mastery_pct))
  check('the teacher API describes the bank (2 topics, 4 each, explain questions)', r.json?.bank?.concepts === 2 && r.json?.bank?.perConcept === 4 && r.json?.bank?.explain === true, JSON.stringify(r.json?.bank))
  check('and never sends the guide content with it', r.json?.guide && !('content' in r.json.guide))

  console.log('\n== Student session on the teacher\'s rules (browser) ==')
  await t('PATCH', `/api/practice-assignments/${asg.id}`, { masteryPct: 60 })
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addCookies(cookiesFor(stu.session))
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(`${BASE}/study-guide/${guide.id}?assignment=${asg.id}`)
  await p.waitForSelector('text=Graded on how many topics you master', { timeout: 45000 })
  // The Start button is on screen before the page is interactive: press until the session opens.
  for (let i = 0; i < 10 && (await p.locator('aside').count()) === 0; i++) {
    await p.getByRole('button', { name: /Start practicing/ }).click({ timeout: 5000 }).catch(() => {})
    await p.waitForTimeout(700)
  }
  await p.waitForSelector('text=2 of its 4 questions right', { timeout: 15000 }).catch(async (e) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/adaptive-fail.png`, fullPage: true }); console.log('panel text:', await p.locator('aside').allTextContents()); throw e })
  check('the side panel states the teacher\'s rule (60% of 4 = 2 of its 4 questions)', true)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/adaptive-student.png` })
  // Right, wrong, right on each topic: 2 of 3 masters at 60%, so 6 questions and no explain question.
  let asked = 0, sawExplain = false
  const perTopic = {}
  for (let i = 0; i < 20; i++) {
    const done = await p.locator('text=/mastered every concept|You mastered \\d of \\d concepts/').count()
    if (done) break
    if (await p.locator('textarea').count()) { sawExplain = true; break }
    const topic = (await p.locator('text=/^(Cellular respiration|Photosynthesis)$/').first().textContent().catch(() => '')) || '?'
    const stem = await p.locator('p.text-lg.font-semibold').first().textContent()
    const key = /respir|Mitochond|ATP/.test(stem) ? 'r' : 'p'
    perTopic[key] = (perTopic[key] ?? 0) + 1
    const pick = perTopic[key] === 2 ? 'False' : 'True'
    const btn = p.getByRole('button', { name: pick, exact: true })
    await btn.click()
    await btn.click()
    asked++
    await p.locator('button.bg-sky-700').last().click()
    await p.waitForTimeout(250)
    void topic
  }
  await p.waitForSelector('text=Turned in', { timeout: 30000 })
  check('each topic stopped after 3 answers (2 of 3 right masters at 60%)', asked === 6, `asked ${asked}`)
  check('no explain question was asked', !sawExplain)
  check('the session turned itself in with both topics mastered', (await p.locator('text=2 of 2 topics mastered').count()) > 0)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/adaptive-done.png`, fullPage: true })
  check('no page errors', errors.length === 0, errors.join(' | '))
  await p.close()
  const { data: tries } = await admin.from('practice_attempts').select('correct, total, seconds, counted, detail').eq('assignment_id', asg.id)
  check('the attempt is 2 of 2 topics, with its length and 6 answers', tries?.length === 1 && Number(tries[0].correct) === 2 && Number(tries[0].total) === 2 && tries[0].seconds > 0 && tries[0].detail?.answers?.length === 6, JSON.stringify(tries).slice(0, 300))

  console.log('\n== More questions per topic (writes to the bank: two small AI calls) ==')
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { questionsPerConcept: 6, explainQuestions: true })
  check('raising it to 6 succeeds', r.status === 200, JSON.stringify(r.json))
  ;({ data: g } = await admin.from('study_guides').select('content').eq('id', guide.id).single())
  const k1 = graded(g.content, 1), k2 = graded(g.content, 2)
  check('both topics now have at least 6 graded questions, added as MORE blocks', k1 >= 6 && k2 >= 6 && /^MORE: k1/m.test(g.content) && /^MORE: k2/m.test(g.content) && !/^REFILL:/m.test(g.content), `k1 ${k1}, k2 ${k2}`)
  check('the original questions are untouched (content only appended)', g.content.startsWith(BANK.trimEnd().slice(0, 400)))
  check('the new questions carry the topic\'s trap tags', /^(IF [A-D]: \[t[12]\]|PROBES: t[12])/m.test(g.content.slice(BANK.length)))
  r = await t('PATCH', `/api/practice-assignments/${asg.id}`, { questionsPerConcept: 6 })
  const { data: g2 } = await admin.from('study_guides').select('content').eq('id', guide.id).single()
  check('asking again writes nothing new', g2.content === g.content)

  console.log('\n== Teacher screens ==')
  const tctx = await b.newContext({ viewport: { width: 1280, height: 1000 } })
  await tctx.addCookies(cookiesFor(teacher.session))
  const tp = await tctx.newPage()
  const terr = []
  tp.on('pageerror', (e) => terr.push(e.message))
  await tp.goto(`${BASE}/teacher/practice/${asg.id}`)
  await tp.waitForSelector('text=/About \\d+ to \\d+ minutes/', { timeout: 45000 })
  check('the assignment page shows the time estimate', true)
  check('with the mastery level and questions per topic selects', (await tp.getByLabel('Mastery level').inputValue()) === '60' && (await tp.getByLabel('Questions per topic').inputValue()) === '6')
  if (SHOTS) await tp.screenshot({ path: `${SHOTS}/adaptive-teacher.png`, fullPage: true })

  await tp.goto(`${BASE}/study-guide/${plain.id}`)
  await tp.getByRole('button', { name: /^Assign/ }).first().click({ timeout: 45000 })
  await tp.waitForSelector('text=Mastery level', { timeout: 15000 })
  await tp.waitForSelector('text=/About \\d+ to \\d+ minutes/', { timeout: 15000 })
  const before = await tp.locator('text=/About \\d+ to \\d+ minutes/').first().textContent()
  await tp.getByRole('button', { name: '8', exact: true }).click()
  const after = await tp.locator('text=/About \\d+ to \\d+ minutes/').first().textContent()
  check('the assign dialog shows the estimate and it grows with questions per topic', before !== after && /About 5 to 10 minutes/.test(before || ''), `${before} -> ${after}`)
  check('and says the extra questions get written', (await tp.locator('text=/extra questions are written/').count()) > 0)
  if (SHOTS) await tp.screenshot({ path: `${SHOTS}/adaptive-dialog.png` })
  check('no teacher page errors', terr.length === 0, terr.join(' | '))
  await b.close()
}

main().catch((e) => { console.error(e); failures++ }).finally(async () => {
  for (const id of classes) await admin.from('classes').delete().eq('id', id)
  await admin.from('study_guides').delete().in('user_id', users)
  for (const id of users) await admin.auth.admin.deleteUser(id)
  console.log(failures ? `\n${failures} failed` : '\nall passed')
  process.exit(failures ? 1 : 0)
})

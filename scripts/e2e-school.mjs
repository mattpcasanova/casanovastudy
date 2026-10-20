// End-to-end check of the school overview (2026-10-20, migration 064): a test
// school domain with two verified teachers and some activity, an admin who
// sees the counts, and a teacher who isn't an admin (403). Throwaway data,
// deleted at the end. Dev server on :3000:
//   node scripts/e2e-school.mjs
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const BASE = 'http://localhost:3000'
const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const DOMAIN = `e2e-${Date.now()}.school.test`

let pass = 0
let fail = 0
const check = (name, cond, detail = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${detail}`) } }
const created = { users: [], classIds: [], guideIds: [], batchId: randomUUID() }

async function makeUser(kind, first, last, schoolEmail) {
  const email = `e2e-school-${first.toLowerCase()}-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  created.users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: kind, first_name: first, last_name: last, birth_date: '1980-01-01' })
  if (schoolEmail) await admin.from('teacher_verifications').insert({ user_id: data.user.id, status: 'approved', method: 'domain', school_email: schoolEmail, email_confirmed_at: new Date().toISOString() })
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await anon.auth.signInWithPassword({ email, password })
  return { id: data.user.id, token: s.session.access_token }
}
const get = async (token, path) => {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return { status: res.status, json: await res.json().catch(() => null) }
}

async function main() {
  await admin.from('verified_school_domains').insert({ domain: DOMAIN, school_name: 'E2E Academy' })
  const ada = await makeUser('teacher', 'Ada', 'Busy', `ada@${DOMAIN}`)
  const ben = await makeUser('teacher', 'Ben', 'Quiet', `ben@staff.${DOMAIN}`)
  const other = await makeUser('teacher', 'Olive', 'Elsewhere', 'olive@another.test')
  const principal = await makeUser('teacher', 'Pat', 'Principal', null)

  const { data: cls } = await admin.from('classes').insert({ teacher_id: ada.id, name: 'E2E SCHOOL CLASS (safe to delete)', period: '1', enrollment_code: 'S' + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z2-9]/g, 'X') }).select('id').single()
  created.classIds.push(cls.id)
  await admin.from('class_roster').insert([{ class_id: cls.id, first_name: 'Sam', last_name: 'One' }, { class_id: cls.id, first_name: 'Kim', last_name: 'Two' }])
  const marks = [{ questionNumber: '1', marksAwarded: 3, marksPossible: 5 }, { questionNumber: '2', marksAwarded: 2, marksPossible: 5 }]
  const papers = [ada, ada, ada, other].map((t, i) => ({ user_id: t.id, batch_id: created.batchId, student_name: `S${i}`, student_exam_filename: 'e2e', total_marks: 5, total_possible_marks: 10, percentage: 50, grade: 'C', content: 'e2e', grade_breakdown: marks, ai_breakdown: marks, released: false, exam_title: 'E2E' }))
  const { data: paperRows } = await admin.from('grading_results').insert(papers).select('id, user_id')
  const { data: guide } = await admin.from('study_guides').insert({ user_id: ben.id, title: 'E2E school guide', subject: 'mathematics', grade_level: '9th', format: 'quiz', content: '## Q\n', file_count: 0 }).select('id').single()
  created.guideIds.push(guide.id)

  console.log('\n== Access ==')
  let r = await get(principal.token, '/api/school/me')
  check('not an admin yet: no schools', r.json?.schools?.length === 0, JSON.stringify(r.json))
  r = await get(principal.token, '/api/school/overview')
  check('not an admin: 403', r.status === 403, `got ${r.status}`)
  await admin.from('school_admins').insert({ user_id: principal.id, domain: DOMAIN })
  r = await get(principal.token, '/api/school/me')
  check('admin sees their school', r.json?.schools?.[0]?.domain === DOMAIN && r.json.schools[0].schoolName === 'E2E Academy', JSON.stringify(r.json))
  r = await get(other.token, `/api/school/overview?domain=${DOMAIN}`)
  check("another teacher can't open it by domain", r.status === 403, `got ${r.status}`)

  console.log('\n== Counts ==')
  r = await get(principal.token, '/api/school/overview')
  const o = r.json
  check('loads', r.status === 200, JSON.stringify(o).slice(0, 200))
  check('only this school\'s teachers (subdomain included)', o.teachers.length === 2 && !o.teachers.some((t) => t.name.includes('Olive')), JSON.stringify(o.teachers.map((t) => t.name)))
  const a = o.teachers.find((t) => t.name === 'Ada Busy')
  check('papers and sets per teacher', a?.papers === 3 && a.sets === 1 && a.papersRecent === 3, JSON.stringify(a))
  check('classes and students this year', a?.classes === 1 && a.students === 2, JSON.stringify(a))
  check('guides per teacher', o.teachers.find((t) => t.name === 'Ben Quiet')?.guides === 1)
  check('totals', o.totals.papers === 3 && o.totals.activeTeachers === 2 && o.totals.teachers === 2, JSON.stringify(o.totals))
  check('this week in the chart', o.weeks.length === 12 && o.weeks[11].papers === 3 && o.weeks[11].guides === 1, JSON.stringify(o.weeks[11]))
  check('no checked reports yet', o.agreement.overall.papers === 0, JSON.stringify(o.agreement))

  console.log('\n== Teacher agreement ==')
  const adaPapers = paperRows.filter((p) => p.user_id === ada.id)
  const patch = (id, body) => fetch(`${BASE}/api/grade-exam/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ada.token}` }, body: JSON.stringify(body) })
  let res = await patch(adaPapers[0].id, { gradeBreakdown: [{ ...marks[0] }, { ...marks[1], marksAwarded: 4 }] })
  check('teacher changes one mark', res.status === 200, `got ${res.status}`)
  res = await patch(adaPapers[1].id, { reviewed: true })
  check('teacher checks another without changes', res.status === 200, `got ${res.status}`)
  const { data: after } = await admin.from('grading_results').select('id, reviewed_at, ai_breakdown, total_marks').in('id', adaPapers.map((p) => p.id))
  const byId = Object.fromEntries(after.map((x) => [x.id, x]))
  check('edited report: reviewed, AI marks kept as graded, total updated', !!byId[adaPapers[0].id].reviewed_at && byId[adaPapers[0].id].ai_breakdown[1].marksAwarded === 2 && Number(byId[adaPapers[0].id].total_marks) === 7, JSON.stringify(byId[adaPapers[0].id]))
  check('unopened report is not counted', !byId[adaPapers[2].id].reviewed_at)
  r = await get(principal.token, '/api/school/overview')
  const ag = r.json.agreement
  check('school agreement: 2 reports, 3 of 4 question marks kept (one moved 2 marks)', ag.overall.papers === 2 && ag.overall.questions === 4 && ag.overall.questionsKept === 3 && ag.overall.questionsWithin1 === 3 && ag.overall.papersUnchanged === 1, JSON.stringify(ag.overall))
  check('per teacher too', ag.byTeacher[ada.id]?.papers === 2 && !ag.byTeacher[ben.id], JSON.stringify(Object.keys(ag.byTeacher)))

  check('no student names in the response', !JSON.stringify(o).includes('Sam') && !JSON.stringify(o).includes('"S0"'))
}

async function cleanup() {
  await admin.from('grading_results').delete().eq('batch_id', created.batchId)
  if (created.guideIds.length) await admin.from('study_guides').delete().in('id', created.guideIds)
  for (const id of created.classIds) { await admin.from('class_roster').delete().eq('class_id', id); await admin.from('classes').delete().eq('id', id) }
  for (const id of created.users) await admin.auth.admin.deleteUser(id)
  await admin.from('verified_school_domains').delete().eq('domain', DOMAIN)
}

main().catch((e) => { console.error('Crashed:', e); fail++ }).finally(async () => { await cleanup(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0) })

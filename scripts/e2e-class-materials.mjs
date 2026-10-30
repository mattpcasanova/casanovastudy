// End-to-end check of class materials (2026-10-29, migration 080): a teacher
// puts prepared slides on two periods, a student in one period sees them and
// builds a guide from them, a student in no class can't use them, and removing
// the material from its last class deletes it and its page images.
// Creates throwaway users and deletes them. Makes one short real guide (~$0.05).
// Dev server on :3000 (E2E_BASE to change):
//   node scripts/e2e-class-materials.mjs
import { readFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import { createRequire } from 'module'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const BASE = process.env.E2E_BASE || 'http://localhost:3000'

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let pass = 0
let fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}
const created = { users: [], classIds: [], guideIds: [] }

async function makeUser(kind, first, last) {
  const email = `e2e-materials-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  created.users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: kind, first_name: first, last_name: last, birth_date: kind === 'teacher' ? '1985-03-01' : '2009-05-01' })
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signin, error: signinErr } = await anon.auth.signInWithPassword({ email, password })
  if (signinErr) throw signinErr
  return { id: data.user.id, session: signin.session }
}

const client = (session) => async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text }
}

/** Runs the guide stream and returns the 'complete' or 'error' event. */
async function generate(call, body) {
  const r = await call('POST', '/api/generate-study-guide-stream', body)
  const events = r.text.split('\n').filter((l) => l.startsWith('data: ')).map((l) => { try { return JSON.parse(l.slice(6)) } catch { return null } }).filter(Boolean)
  return { status: r.status, end: events.find((e) => e.type === 'complete') ?? events.find((e) => e.type === 'error') ?? null }
}

const FACT = 'The Zorblax cycle has four stages, in order: grimble, frandle, quorp and splee. Quorp is the only stage that needs moonlight.'

async function main() {
  const teacher = await makeUser('teacher', 'E2E', 'Teacher')
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const inClass = await makeUser('student', 'Maya', 'Lopez')
  const outside = await makeUser('student', 'Sam', 'Other')
  const t = client(teacher.session), s = client(inClass.session), o = client(outside.session)

  const code = () => 'E2M' + Math.random().toString(36).slice(2, 5).toUpperCase()
  const { data: classes } = await admin.from('classes').insert([
    { teacher_id: teacher.id, name: 'E2E Bio', period: '2', enrollment_code: code() },
    { teacher_id: teacher.id, name: 'E2E Bio', period: '5', enrollment_code: code() },
  ]).select('id, period')
  created.classIds = classes.map((c) => c.id)
  const p2 = classes.find((c) => c.period === '2'), p5 = classes.find((c) => c.period === '5')
  await admin.from('class_enrollments').insert({ class_id: p2.id, student_id: inClass.id, status: 'active' })

  // One page image in the teacher's folder, like a scanned PDF page.
  const jpg = join(tmpdir(), `e2e-material-${Date.now()}.jpg`)
  execFileSync('sips', ['-s', 'format', 'jpeg', `${ROOT}/public/icons/icon-192.png`, '--out', jpg], { stdio: 'ignore' })
  const imagePath = `${teacher.id}/class-materials/page-1-e2e.jpg`
  await admin.storage.from('uploads').upload(imagePath, readFileSync(jpg), { contentType: 'image/jpeg' })

  console.log('Teacher adds a material')
  let r = await s('POST', '/api/class-materials', { name: 'x.pptx', content: 'x', classIds: [p2.id] })
  check('students cannot add materials', r.status === 403, r.status)
  r = await t('POST', '/api/class-materials', { name: 'Zorblax.pptx', content: 'x', images: [{ path: `${outside.id}/class-materials/a.jpg`, name: 'a.jpg' }], classIds: [p2.id] })
  check("someone else's files are refused", r.status === 403, r.status)
  r = await t('POST', '/api/class-materials', { name: 'Unit 4 Zorblax.pptx', content: `Slide 1\n${FACT}`, images: [{ path: imagePath, name: 'page-1.jpg' }], classIds: [p2.id, p5.id], note: 'For Friday' })
  check('material saved', r.status === 200 && r.json?.id, JSON.stringify(r.json))
  const materialId = r.json?.id

  r = await t('GET', `/api/class-materials?classId=${p2.id}`)
  const row = r.json?.materials?.[0]
  check('class page lists it', row?.materialId === materialId && row.kind === 'slides' && row.note === 'For Friday', JSON.stringify(r.json))
  check('it shows the other period', row?.otherClasses?.length === 1 && row.otherClasses[0].period === '5')

  r = await t('GET', '/api/class-materials')
  check("teacher's guide maker lists it under each period", r.json?.classes?.length === 2 && r.json.materials.filter((m) => m.materialId === materialId).length === 2, JSON.stringify(r.json))

  console.log('Students see it')
  r = await s('GET', '/api/student/classwork')
  const mine = r.json?.materials ?? []
  check('student in the class sees it', mine.some((m) => m.materialId === materialId && m.name === 'Unit 4 Zorblax.pptx'), JSON.stringify(mine))
  check('student never gets the content', !JSON.stringify(r.json).includes('grimble'))
  r = await o('GET', '/api/student/classwork')
  check('student in no class sees nothing', !(r.json?.materials ?? []).length)

  console.log('Building a guide from it (real model call)')
  const body = { classMaterialIds: [materialId], studyGuideName: 'Unit 4 Zorblax', subject: 'biology', gradeLevel: '9th', format: 'quiz', length: 'short', sourcePolicy: 'strict' }
  let g = await generate(s, body)
  check('guide built', g.end?.type === 'complete', JSON.stringify(g.end))
  if (g.end?.id) {
    created.guideIds.push(g.end.id)
    const { data: guide } = await admin.from('study_guides').select('content, source_material_ids, file_count').eq('id', g.end.id).single()
    check('guide uses the slide content', /grimble|frandle|quorp|splee/i.test(guide.content), guide.content.slice(0, 200))
    check('guide records the material', guide.source_material_ids?.[0] === materialId && guide.file_count === 1, JSON.stringify(guide.source_material_ids))
  }
  g = await generate(o, body)
  check('student in no class cannot use it', g.status === 400, `${g.status} ${JSON.stringify(g.end)}`)

  r = await t('GET', `/api/class-materials?classId=${p2.id}`)
  check('teacher sees it was used', r.json?.materials?.[0]?.guides === 1, JSON.stringify(r.json?.materials?.[0]))

  console.log('Removing it')
  r = await t('GET', `/api/class-materials?classId=${p2.id}`)
  await t('DELETE', '/api/class-materials', { linkId: r.json.materials[0].id })
  r = await s('GET', '/api/student/classwork')
  check('off period 2: student no longer sees it', !(r.json?.materials ?? []).length)
  let { data: still } = await admin.from('teacher_materials').select('id').eq('id', materialId)
  check('still on period 5, so kept', still?.length === 1)
  r = await t('GET', `/api/class-materials?classId=${p5.id}`)
  await t('DELETE', '/api/class-materials', { linkId: r.json.materials[0].id })
  ;({ data: still } = await admin.from('teacher_materials').select('id').eq('id', materialId))
  check('off its last class: deleted', !still?.length)
  const { data: files } = await admin.storage.from('uploads').list(`${teacher.id}/class-materials`)
  check('its page image is gone', !(files ?? []).some((f) => f.name === 'page-1-e2e.jpg'), JSON.stringify(files))
}

async function cleanup() {
  for (const id of created.guideIds) await admin.from('study_guides').delete().eq('id', id)
  for (const id of created.classIds) await admin.from('classes').delete().eq('id', id)
  for (const id of created.users) {
    const { data: files } = await admin.storage.from('uploads').list(`${id}/class-materials`)
    if (files?.length) await admin.storage.from('uploads').remove(files.map((f) => `${id}/class-materials/${f.name}`))
    await admin.from('usage_events').delete().eq('user_id', id)
    await admin.auth.admin.deleteUser(id)
  }
}

try {
  await main()
} catch (e) {
  fail++
  console.error(e)
} finally {
  await cleanup()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

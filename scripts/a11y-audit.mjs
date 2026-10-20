// Accessibility audit (axe-core, WCAG 2.1 A/AA) of the teacher and student
// pages. Creates a throwaway teacher + student with a class, a graded set, an
// assigned quiz and a practice set, signs them in through cookies, runs axe on
// every page in headless Chromium, then deletes everything. Dev server on :3000:
//   node scripts/a11y-audit.mjs [--json out.json] [--only /teach]
import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { randomUUID } from 'crypto'

const ROOT = new URL('..', import.meta.url).pathname
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const { chromium } = require('playwright')
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const BASE = 'http://localhost:3000'

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const REF = new globalThis.URL(URL_).hostname.split('.')[0]
const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined }

const created = { users: [], classId: null, guideIds: [], batchId: randomUUID() }

async function makeUser(kind, first, last) {
  const email = `e2e-a11y-${kind}-${Date.now()}@example.com`
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10)
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  created.users.push(data.user.id)
  await admin.from('user_profiles').insert({ id: data.user.id, email, user_type: kind, first_name: first, last_name: last, birth_date: kind === 'teacher' ? '1985-03-01' : '2009-05-01' })
  const anon = createClient(URL_, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signin, error: e2 } = await anon.auth.signInWithPassword({ email, password })
  if (e2) throw e2
  return { id: data.user.id, session: signin.session }
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

const api = (session) => async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

async function copyGuide(teacherId, format) {
  const { data: src } = await admin.from('study_guides').select('title, subject, grade_level, content').eq('format', format).not('content', 'is', null).order('created_at', { ascending: false }).limit(1).single()
  const { data } = await admin.from('study_guides').insert({ user_id: teacherId, title: `A11y ${format}: ${src.title}`.slice(0, 120), subject: src.subject, grade_level: src.grade_level, format, content: src.content, file_count: 0 }).select('id').single()
  created.guideIds.push(data.id)
  return data.id
}

async function seed() {
  const teacher = await makeUser('teacher', 'Ada', 'Teacher')
  const student = await makeUser('student', 'Sean', 'Miller')
  await admin.from('teacher_verifications').upsert({ user_id: teacher.id, status: 'approved', method: 'manual', decided_at: new Date().toISOString() })
  const t = api(teacher.session)
  const { data: cls } = await admin.from('classes').insert({ teacher_id: teacher.id, name: 'A11Y AUDIT CLASS (safe to delete)', period: '3', enrollment_code: 'A' + Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z2-9]/g, 'X') }).select('id, enrollment_code').single()
  created.classId = cls.id
  await t('POST', `/api/classes/${cls.id}/roster`, { text: 'Sean Miller\nLee, Mary Ann\nAva Kim\nNoah Park' })
  await api(student.session)('POST', '/api/classes/join', { code: cls.enrollment_code })
  const roster = (await t('GET', `/api/classes/${cls.id}/roster`)).json.roster
  const breakdown = (a, b) => [
    { questionNumber: '1', marksAwarded: a, marksPossible: 5, explanation: 'Method fine.', feedback: 'Good start.' },
    { questionNumber: '2', marksAwarded: b, marksPossible: 5, explanation: 'Check units.', feedback: 'Show the units.' },
  ]
  const rows = [['Sean Miller', 4, 3], ['Mary Ann Lee', 5, 4], ['Ava Kim', 2, 2]].map(([name, a, b]) => ({
    user_id: teacher.id, batch_id: created.batchId, student_name: name, student_exam_filename: 'a11y', total_marks: a + b, total_possible_marks: 10,
    percentage: (a + b) * 10, grade: 'B', content: 'a11y', grade_breakdown: breakdown(a, b), released: true, exam_title: 'A11y Quiz',
    class_id: cls.id, roster_id: roster.find((r) => `${r.firstName} ${r.lastName}` === name)?.id ?? null,
  }))
  const { data: results } = await admin.from('grading_results').insert(rows).select('id, student_name')
  const quizId = await copyGuide(teacher.id, 'quiz')
  const practiceId = await copyGuide(teacher.id, 'practice')
  const adaptiveId = await copyGuide(teacher.id, 'adaptive')
  const flashId = await copyGuide(teacher.id, 'flashcards')
  const outlineId = await copyGuide(teacher.id, 'outline')
  const sean = roster.find((r) => r.firstName === 'Sean')
  const assigned = await t('POST', '/api/practice-assignments', { guideId: quizId, classId: cls.id, rosterIds: roster.map((r) => r.id), maxAttempts: 2 })
  const a = assigned.json?.assignment
  return { teacher, student, cls, results, quizId, practiceId, adaptiveId, flashId, outlineId, sean, assignment: a }
}

async function audit(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
  await page.addScriptTag({ content: AXE })
  return page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 220), summary: n.failureSummary?.slice(0, 300) })) }))
  })
}

async function main() {
  const s = await seed()
  const pages = {
    teacher: [
      '/teach', '/teacher/classes', `/teacher/classes/${s.cls.id}`, `/teacher/classes/${s.cls.id}/students/${s.sean.id}`,
      '/grade-exam/batch', '/grade-exam', `/grade-exam/batch/${created.batchId}`, `/grade-exam/batch/${created.batchId}/reteach`,
      `/grade-report/${s.results[0].id}`, '/graded-exams', '/my-guides', s.assignment ? `/teacher/practice/${s.assignment.id}` : null,
      `/study-guide/${s.quizId}`,
    ],
    student: [
      '/', '/progress', s.assignment ? `/practice/${s.assignment.code}` : null, `/study-guide/${s.quizId}`, `/study-guide/${s.practiceId}`,
      `/study-guide/${s.adaptiveId}`, `/study-guide/${s.flashId}`, `/study-guide/${s.outlineId}`, `/study-guide/${s.quizId}/learn`,
    ],
    signedOut: ['/auth/signin', '/auth/signup', '/privacy'],
  }
  const only = flag('only')
  const browser = await chromium.launch()
  const report = []
  try {
    for (const [who, urls] of Object.entries(pages)) {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
      if (who !== 'signedOut') await ctx.addCookies(cookiesFor((who === 'teacher' ? s.teacher : s.student).session))
      const page = await ctx.newPage()
      for (const url of urls.filter(Boolean)) {
        if (only && !url.startsWith(only)) continue
        try {
          const v = await audit(page, url)
          report.push({ who, url, violations: v })
          console.log(`${who.padEnd(9)} ${url.padEnd(70)} ${v.length ? v.map((x) => `${x.id}(${x.nodes.length})`).join(' ') : 'clean'}`)
        } catch (e) {
          console.log(`${who.padEnd(9)} ${url.padEnd(70)} ERROR ${e.message.slice(0, 120)}`)
        }
      }
      await ctx.close()
    }
  } finally {
    await browser.close()
  }
  const out = flag('json')
  if (out) writeFileSync(out, JSON.stringify(report, null, 2))
  const byRule = new Map()
  for (const p of report) for (const v of p.violations) {
    const cur = byRule.get(v.id) ?? { impact: v.impact, help: v.help, pages: 0, nodes: 0 }
    cur.pages++; cur.nodes += v.nodes.length
    byRule.set(v.id, cur)
  }
  console.log('\nBy rule:')
  for (const [id, r] of [...byRule].sort((a, b) => b[1].nodes - a[1].nodes)) console.log(`  ${id.padEnd(28)} ${String(r.impact).padEnd(9)} ${r.nodes} on ${r.pages} page(s): ${r.help}`)
}

async function cleanup() {
  if (created.classId) {
    await admin.from('practice_assignments').delete().eq('class_id', created.classId)
    await admin.from('grading_results').delete().eq('batch_id', created.batchId)
    await admin.from('class_roster').delete().eq('class_id', created.classId)
    await admin.from('class_enrollments').delete().eq('class_id', created.classId)
    await admin.from('classes').delete().eq('id', created.classId)
  }
  if (created.guideIds.length) await admin.from('study_guides').delete().in('id', created.guideIds)
  for (const id of created.users) await admin.auth.admin.deleteUser(id)
}

main().catch((e) => { console.error('Crashed:', e); process.exitCode = 1 }).finally(cleanup)

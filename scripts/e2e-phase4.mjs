// Phase 4 E2E: import-from-material. Uploads a real PDF through the app's
// Cloudinary route, runs extraction, verifies concept-tagged suggestions +
// proposed-concept creation. Disposable teacher; full cleanup.
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const ROOT = '/Users/mattcasanova/Projects/casanovastudy'
const require = createRequire(`${ROOT}/package.json`)
const { createClient } = require('@supabase/supabase-js')
const BASE = 'http://localhost:3000'

// Build a minimal single-page PDF worksheet (Helvetica text) so the fixture
// deterministically contains extractable questions.
function makeWorksheetPdf(lines) {
  const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const contentLines = lines.map((l, i) => `${i === 0 ? 'BT /F1 11 Tf 50 740 Td' : '0 -18 Td'} (${esc(l)}) Tj`).join('\n')
  const stream = `${contentLines}\nET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(pdf, 'latin1')
}

const WORKSHEET_LINES = [
  'AP Statistics Worksheet: Sampling Distributions and Confidence Intervals',
  '',
  '1. A population has mean 50 and standard deviation 10. For samples of size 25,',
  '   what is the standard deviation of the sampling distribution of the sample mean?',
  '   (a) 10   (b) 2   (c) 0.4   (d) 50',
  '',
  '2. True or False: The Central Limit Theorem says the sampling distribution of the',
  '   sample mean is approximately normal for large n, regardless of population shape.',
  '',
  '3. A 95% confidence interval for a mean is (12.1, 15.9). What is the margin of error?',
  '',
  '4. Which condition must be checked before constructing a one-sample z-interval for a',
  '   proportion? (a) np >= 10 and n(1-p) >= 10  (b) n >= 100  (c) sigma known  (d) skewness = 0',
  '',
  'Answer key: 1. b   2. True   3. 1.9   4. a',
]

// Minimal .pptx (zip with slide XML) — lecture CONTENT with no questions,
// exercising both PowerPoint parsing and generate-from-content.
function makeLecturePptx() {
  const PizZip = require('pizzip')
  const zip = new PizZip()
  const slide = (texts) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>${texts.map(t => `<p:sp><p:txBody><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp>`).join('')}</p:spTree></p:cSld></p:sld>`
  zip.file('ppt/slides/slide1.xml', slide([
    'AP Chemistry Unit 4: Limiting Reactants',
    'The limiting reactant is the reactant that is completely consumed first and determines the maximum amount of product.',
    'To find it: convert each reactant to moles of product using mole ratios; the reactant giving the LEAST product is limiting.',
  ]))
  zip.file('ppt/slides/slide2.xml', slide([
    'Percent Yield',
    'Percent yield = (actual yield / theoretical yield) x 100.',
    'Theoretical yield comes from the limiting reactant calculation.',
    'Example: if theoretical yield is 24.0 g and actual is 18.0 g, percent yield is 75.0%.',
  ]))
  return zip.generate({ type: 'nodebuffer' })
}

const env = {}
for (const line of readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const REF = new globalThis.URL(URL).hostname.split('.')[0]
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${detail}`) }
}

const created = { teacherId: null }

function cookieFor(session) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${REF}-auth-token`
  const CHUNK = 3180
  if (value.length <= CHUNK) return `${name}=${value}`
  const parts = []
  for (let i = 0; i * CHUNK < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`)
  return parts.join('; ')
}

async function main() {
  const email = 'e2e-p4-teacher@example.com'
  const { data: prior } = await admin.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (prior) await admin.auth.admin.deleteUser(prior.id)
  const password = 'E2e!' + Math.random().toString(36).slice(2, 12)
  const { data: u, error: uErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (uErr) throw uErr
  created.teacherId = u.user.id
  await admin.from('user_profiles').insert({ id: u.user.id, email, user_type: 'teacher', first_name: 'E2E', last_name: 'P4Teacher' })
  const anon = createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signin } = await anon.auth.signInWithPassword({ email, password })
  const cookie = cookieFor(signin.session)

  // One pre-existing concept so extraction has a list to tag against
  const cRes = await fetch(`${BASE}/api/concepts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: 'E2E P4 General Review', description: 'Catch-all concept for this study guide topic.' }),
  })
  check('pre-existing concept created', cRes.status === 201)

  console.log('\n== Upload PDF via app route ==')
  const pdfBytes = makeWorksheetPdf(WORKSHEET_LINES)
  const fd = new FormData()
  fd.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'e2e-worksheet.pdf')
  fd.append('folder', 'casanovastudy/question-bank-imports')
  const upRes = await fetch(`${BASE}/api/upload-to-cloudinary`, {
    method: 'POST', headers: { Cookie: cookie }, body: fd,
  })
  const upJson = await upRes.json()
  check('upload succeeded', upRes.ok && !!upJson.url, `got ${upRes.status}: ${JSON.stringify(upJson).slice(0, 200)}`)
  if (!upJson.url) throw new Error('upload failed, aborting')

  console.log('\n== Extract ==')
  const exRes = await fetch(`${BASE}/api/question-bank/extract`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ file_urls: [{ url: upJson.url, name: 'e2e-worksheet.pdf', type: 'application/pdf' }] }),
  })
  const exJson = await exRes.json()
  check('extract returns 201', exRes.status === 201, `got ${exRes.status}: ${JSON.stringify(exJson).slice(0, 300)}`)
  check('questions extracted', (exJson.total_created ?? 0) > 0, `got ${exJson.total_created}`)
  console.log(`  (extracted ${exJson.total_created}; new concepts: ${(exJson.created_concepts ?? []).map(c => c.name).join(', ') || 'none'})`)

  const { data: rows } = await admin.from('question_bank_questions')
    .select('type, status, source, source_material_url, question_text, options, correct_answer')
    .eq('teacher_id', created.teacherId)
  const extracted = (rows ?? []).filter(r => r.source === 'ai_extracted')
  check('all extracted rows are suggestions', extracted.length > 0 && extracted.every(r => r.status === 'suggested'))
  check('source material URL recorded', extracted.every(r => r.source_material_url === upJson.url))
  check('MC shapes valid', extracted.filter(r => r.type === 'multiple_choice').every(r =>
    Array.isArray(r.options) && typeof r.correct_answer.index === 'number' && r.correct_answer.index < r.options.length))

  // Guard: non-cloudinary URL rejected
  const badRes = await fetch(`${BASE}/api/question-bank/extract`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ file_urls: [{ url: 'https://evil.example.com/x.pdf' }] }),
  })
  check('non-cloudinary URL rejected', badRes.status === 400, `got ${badRes.status}`)

  console.log('\n== PowerPoint lecture (content only, no questions) ==')
  const pptxBytes = makeLecturePptx()
  const fd2 = new FormData()
  fd2.append('file', new Blob([pptxBytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), 'e2e-lecture.pptx')
  fd2.append('folder', 'casanovastudy/question-bank-imports')
  const up2 = await fetch(`${BASE}/api/upload-to-cloudinary`, { method: 'POST', headers: { Cookie: cookie }, body: fd2 })
  const up2Json = await up2.json()
  check('pptx upload accepted', up2.ok && !!up2Json.url, `got ${up2.status}: ${JSON.stringify(up2Json).slice(0, 200)}`)

  const before = new Set(((await admin.from('concepts').select('id').eq('teacher_id', created.teacherId)).data ?? []).map(c => c.id))
  const ex2 = await fetch(`${BASE}/api/question-bank/extract`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ file_urls: [{ url: up2Json.url, name: 'e2e-lecture.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }] }),
  })
  const ex2Json = await ex2.json()
  check('pptx extraction returns 201', ex2.status === 201, `got ${ex2.status}: ${JSON.stringify(ex2Json).slice(0, 300)}`)
  check('questions GENERATED from question-free content', (ex2Json.total_created ?? 0) >= 4, `got ${ex2Json.total_created}`)
  console.log(`  (created ${ex2Json.total_created}; new concepts: ${(ex2Json.created_concepts ?? []).map(c => c.name).join(', ') || 'none'})`)
  check('new concepts proposed from slide content', (ex2Json.created_concepts ?? []).length >= 1, JSON.stringify(ex2Json.created_concepts))

  const { data: newQs } = await admin.from('question_bank_questions')
    .select('concept_id, status, source').eq('teacher_id', created.teacherId).eq('source', 'ai_extracted')
  const newConceptQs = (newQs ?? []).filter(q => !before.has(q.concept_id))
  check('generated questions attached to the new concepts', newConceptQs.length >= 4, `got ${newConceptQs.length}`)
  check('all queued as suggestions', (newQs ?? []).every(q => q.status === 'suggested'))
}

async function cleanup() {
  console.log('\n== Cleanup ==')
  try {
    if (created.teacherId) {
      await admin.from('concepts').delete().eq('teacher_id', created.teacherId)
      await admin.auth.admin.deleteUser(created.teacherId)
    }
    console.log('  fixture removed')
  } catch (e) {
    console.error('  CLEANUP FAILED:', JSON.stringify(created), e.message)
  }
}

main()
  .catch(e => { fail++; console.error('FATAL:', e) })
  .finally(async () => {
    await cleanup()
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail > 0 ? 1 : 0)
  })

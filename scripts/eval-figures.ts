// Live eval for graph figures in generated quizzes: generates a fixed matrix of
// quizzes and reports how many figures each got, their kinds, and any that fail
// to parse. Use it to tune the budgets in lib/formats/figures.ts.
//
//   npx tsx --env-file=.env.local scripts/eval-figures.ts [outDir] [--set=math|chem|packs]
//
// Costs real API calls (one Opus quiz generation per case).

import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ClaudeService } from '../lib/claude-api'
import { figurePolicy } from '../lib/formats/figures'
import { parseQuizContent } from '../lib/formats/quiz'
import { parseGraphSpec } from '../lib/graphs/spec'

interface Case { name: string; subject: string; goal: string; gradeLevel: string; studyRequest: string; expect: [number, number]; format?: string }

const CASES: Case[] = [
  { name: 'sat-math', subject: 'test-prep', goal: 'exam', gradeLevel: '11th', studyRequest: 'SAT Math: linear equations, systems, quadratics, geometry and data analysis', expect: [5, 7] },
  { name: 'geometry', subject: 'mathematics', goal: 'class', gradeLevel: '10th', studyRequest: 'Geometry: similar triangles, the Pythagorean theorem, and circles (arcs, angles, area)', expect: [5, 7] },
  { name: 'ap-stats', subject: 'mathematics', goal: 'exam', gradeLevel: '12th', studyRequest: 'AP Statistics Unit 1: describing distributions, boxplots, histograms and scatterplots', expect: [5, 7] },
  { name: 'algebra-linear', subject: 'mathematics', goal: 'class', gradeLevel: '9th', studyRequest: 'Algebra 1: slope, slope-intercept form, and graphing linear functions', expect: [5, 7] },
  { name: 'ap-bio', subject: 'science', goal: 'exam', gradeLevel: '11th', studyRequest: 'AP Biology: cellular respiration and photosynthesis', expect: [0, 4] },
  { name: 'us-history', subject: 'history', goal: 'class', gradeLevel: '11th', studyRequest: 'US History: causes of the Civil War', expect: [0, 0] },
]

// Chemistry models are content-triggered, so `expect` is a loose total figure range.
const CHEM_CASES: Case[] = [
  { name: 'chem-bonding-outline', format: 'outline', subject: 'science', goal: 'exam', gradeLevel: '11th', studyRequest: 'AP Chemistry Unit 2: chemical bonding, Lewis structures, formal charge, VSEPR and molecular geometry, bond energy and bond length', expect: [5, 20] },
  { name: 'chem-bonding-quiz', subject: 'science', goal: 'exam', gradeLevel: '11th', studyRequest: 'AP Chemistry Unit 2: Lewis structures, VSEPR shapes and polarity', expect: [2, 9] },
  { name: 'kinetics-summary', format: 'summary', subject: 'science', goal: 'class', gradeLevel: '11th', studyRequest: 'Reaction kinetics: activation energy, catalysts and reaction energy diagrams', expect: [1, 6] },
]

// Biology/physics packs and the general diagram (content-triggered, loose ranges).
const PACK_CASES: Case[] = [
  { name: 'genetics-outline', format: 'outline', subject: 'science', goal: 'class', gradeLevel: '11th', studyRequest: 'AP Biology: Mendelian genetics, Punnett squares, sex-linked traits and pedigrees', expect: [3, 15] },
  { name: 'genetics-quiz', subject: 'science', goal: 'class', gradeLevel: '10th', studyRequest: 'Biology: monohybrid and dihybrid crosses, pedigrees', expect: [2, 9] },
  { name: 'forces-outline', format: 'outline', subject: 'science', goal: 'exam', gradeLevel: '11th', studyRequest: "AP Physics 1: Newton's laws, free-body diagrams, friction and inclines", expect: [3, 15] },
  { name: 'history-outline', format: 'outline', subject: 'history', goal: 'class', gradeLevel: '11th', studyRequest: 'US History: causes of the American Revolution', expect: [1, 4] },
]

/** Every graph fence in a guide, parsed. */
function fenceStats(content: string) {
  const kinds: Record<string, number> = {}
  const failures: string[] = []
  let warnings = 0
  const re = /^\s*```(?:graph|plot|chart|figure|molecule|lewis|model|diagram)\s*\n([\s\S]*?)^\s*```\s*$/gim
  for (let m = re.exec(content); m; m = re.exec(content)) {
    const r = parseGraphSpec(m[1])
    warnings += r.warnings.length
    if (r.ok) {
      const kind = r.spec.kind === 'plane' && r.spec.yLabel?.startsWith('Potential energy') ? 'energy-well' : r.spec.kind
      kinds[kind] = (kinds[kind] ?? 0) + 1
    } else failures.push(r.error)
  }
  return { total: Object.values(kinds).reduce((a, b) => a + b, 0) + failures.length, kinds, failures, warnings }
}

async function run(c: Case, svc: ClaudeService, outDir: string) {
  if (c.format && c.format !== 'quiz') {
    const started = Date.now()
    const { content } = await svc.generateStudyGuide({
      content: '', format: c.format, subject: c.subject, goal: c.goal, gradeLevel: c.gradeLevel, studyRequest: c.studyRequest,
    } as Parameters<ClaudeService['generateStudyGuide']>[0])
    writeFileSync(path.join(outDir, `${c.name}.md`), content)
    const st = fenceStats(content)
    return { case: c.name, format: c.format, figures: st.total, expected: `${c.expect[0]}-${c.expect[1]}`, inRange: st.total >= c.expect[0] && st.total <= c.expect[1], kinds: st.kinds, failures: st.failures, warnings: st.warnings, seconds: Math.round((Date.now() - started) / 1000) }
  }
  const tier = figurePolicy({ subject: c.subject, goal: c.goal, text: c.studyRequest })
  const started = Date.now()
  const { content } = await svc.generateStudyGuide({
    content: '', format: 'quiz', subject: c.subject, goal: c.goal, gradeLevel: c.gradeLevel, studyRequest: c.studyRequest,
  } as Parameters<ClaudeService['generateStudyGuide']>[0])
  writeFileSync(path.join(outDir, `${c.name}.md`), content)

  const questions = parseQuizContent(content)
  const withFig = questions.filter((q) => q.figure)
  const kinds: Record<string, number> = {}
  const failures: string[] = []
  let warnings = 0
  for (const q of withFig) {
    const r = parseGraphSpec(q.figure!)
    warnings += r.warnings.length
    if (r.ok) kinds[r.spec.kind] = (kinds[r.spec.kind] ?? 0) + 1
    else failures.push(`${q.id}: ${r.error}`)
  }
  // Fences the quiz parser didn't attach to any question.
  const fences = (content.match(/^\s*```(graph|plot|chart|figure|molecule|lewis|model|diagram)\b/gim) ?? []).length
  const inRange = withFig.length >= c.expect[0] && withFig.length <= c.expect[1]
  return {
    case: c.name, tier, questions: questions.length, figures: withFig.length, expected: `${c.expect[0]}-${c.expect[1]}`,
    inRange, unattached: fences - withFig.length, kinds, failures, warnings, seconds: Math.round((Date.now() - started) / 1000),
  }
}

async function main() {
  const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? path.join(tmpdir(), `eval-figures-${Date.now()}`)
  mkdirSync(outDir, { recursive: true })
  const svc = new ClaudeService()
  const set = process.argv.find((a) => a.startsWith('--set='))?.slice(6)
  const cases = set === 'chem' ? CHEM_CASES : set === 'math' ? CASES : set === 'packs' ? PACK_CASES : [...CASES, ...CHEM_CASES, ...PACK_CASES]
  const results = await Promise.all(cases.map((c) => run(c, svc, outDir).catch((e) => ({ case: c.name, error: String(e) }))))
  console.log(JSON.stringify(results, null, 2))
  console.log(`\nGenerated quizzes saved in ${outDir}`)
}

main()

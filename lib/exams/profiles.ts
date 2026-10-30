// Exam profiles: when a request is about a big standardized test we know, the
// prompt gets a reference for it (item format, the domain's skills, what hard
// looks like, the traps, exemplar items in the test's voice) instead of relying
// on the model's memory of the test. Pure: detection and prompt text only.
//
// Profiles so far: SAT Math (sat-math.ts), SAT Reading and Writing (sat-rw.ts),
// ACT English / Math / Reading / Science (act-*.ts), AP Chemistry, AP
// Statistics, AP Biology, AP Calculus AB/BC, AP Physics 1, AP English Language,
// APUSH, AP World History: Modern and AP U.S. Government (ap-*.ts). Adding one
// = a profile file + an entry in EXAM_PROFILES.

import type { ExamDomain, ExamProfile } from './types'
import { SAT_MATH } from './sat-math'
import { SAT_RW } from './sat-rw'
import { ACT_ENGLISH } from './act-english'
import { ACT_MATH } from './act-math'
import { ACT_READING } from './act-reading'
import { ACT_SCIENCE } from './act-science'
import { AP_CHEMISTRY } from './ap-chemistry'
import { AP_STATISTICS } from './ap-statistics'
import { AP_BIOLOGY } from './ap-biology'
import { AP_CALCULUS } from './ap-calculus'
import { AP_PHYSICS_1 } from './ap-physics1'
import { AP_LANG } from './ap-lang'
import { AP_USH } from './ap-ush'
import { AP_WORLD } from './ap-world'
import { AP_GOV } from './ap-gov'
import { AP_LIT } from './ap-lit'
import { AP_EURO } from './ap-euro'
import { AP_HUMAN_GEO } from './ap-human-geo'
import { AP_PSYCHOLOGY } from './ap-psychology'
import { AP_MICRO } from './ap-microeconomics'
import { AP_MACRO } from './ap-macroeconomics'
import { AP_ENVIRONMENTAL } from './ap-environmental'
import { AP_PHYSICS_2 } from './ap-physics2'
import { AP_PHYSICS_C } from './ap-physics-c'
import { AP_CSA } from './ap-csa'
import { AP_COMP_GOV } from './ap-comparative-gov'
import { AP_PRECALC } from './ap-precalculus'
import { FL_FAST_ELA } from './fl-fast-ela'
import { FL_FAST_MATH } from './fl-fast-math'
import { FL_ALGEBRA1_EOC } from './fl-algebra1-eoc'
import { FL_GEOMETRY_EOC } from './fl-geometry-eoc'
import { FL_BIOLOGY_EOC } from './fl-biology-eoc'
import { FL_CIVICS_EOC } from './fl-civics-eoc'
import { FL_USHISTORY_EOC } from './fl-ushistory-eoc'
import { AICE_GENERAL_PAPER } from './aice-general-paper'
import { AICE_THINKING_SKILLS } from './aice-thinking-skills'
import { AICE_MARINE_SCIENCE } from './aice-marine-science'
import { AICE_ENVIRONMENTAL_MANAGEMENT } from './aice-environmental-management'
import { AICE_BIOLOGY } from './aice-biology'
import { AICE_CHEMISTRY } from './aice-chemistry'
import { AICE_PSYCHOLOGY } from './aice-psychology'
import { AICE_SOCIOLOGY } from './aice-sociology'
import { AICE_ENGLISH_LANGUAGE } from './aice-english-language'
import { AICE_LITERATURE } from './aice-literature'
import { AICE_GLOBAL_PERSPECTIVES } from './aice-global-perspectives'
import { AICE_MATHEMATICS } from './aice-mathematics'
import { AICE_BUSINESS } from './aice-business'
import { AICE_ECONOMICS } from './aice-economics'
import { AICE_US_HISTORY } from './aice-us-history'
import { AICE_EUROPEAN_HISTORY } from './aice-european-history'
import { GRE_QUANT } from './gre-quant'
import { GRE_VERBAL } from './gre-verbal'
import { GMAT } from './gmat'
import { LSAT } from './lsat'
import { MCAT } from './mcat'

export const EXAM_PROFILES: ExamProfile[] = [SAT_MATH, SAT_RW, ACT_ENGLISH, ACT_MATH, ACT_READING, ACT_SCIENCE, AP_CHEMISTRY, AP_STATISTICS, AP_BIOLOGY, AP_CALCULUS, AP_PHYSICS_1, AP_LANG, AP_USH, AP_WORLD, AP_GOV, AP_LIT, AP_EURO, AP_HUMAN_GEO, AP_PSYCHOLOGY, AP_MICRO, AP_MACRO, AP_ENVIRONMENTAL, AP_PHYSICS_2, AP_PHYSICS_C, AP_CSA, AP_COMP_GOV, AP_PRECALC, FL_FAST_ELA, FL_FAST_MATH, FL_ALGEBRA1_EOC, FL_GEOMETRY_EOC, FL_BIOLOGY_EOC, FL_CIVICS_EOC, FL_USHISTORY_EOC, AICE_GENERAL_PAPER, AICE_THINKING_SKILLS, AICE_MARINE_SCIENCE, AICE_ENVIRONMENTAL_MANAGEMENT, AICE_BIOLOGY, AICE_CHEMISTRY, AICE_PSYCHOLOGY, AICE_SOCIOLOGY, AICE_ENGLISH_LANGUAGE, AICE_LITERATURE, AICE_GLOBAL_PERSPECTIVES, AICE_MATHEMATICS, AICE_BUSINESS, AICE_ECONOMICS, AICE_US_HISTORY, AICE_EUROPEAN_HISTORY, GRE_QUANT, GRE_VERBAL, GMAT, LSAT, MCAT]

/** Formats that get the full item rules and exemplars (they write test items). */
const ITEM_FORMATS = new Set(['quiz', 'practice', 'adaptive'])

export interface ExamMatch {
  profile: ExamProfile
  /** Domains the request names; empty = the whole section. */
  domains: ExamDomain[]
  /** The score the learner says they have now, and the one they want, when the request says. */
  score?: { current?: number; target?: number }
}

/** "I got a 630", "scored 650", "from 630 to 800", "going for a 750", "aiming for 700+"; on a 1-36 test, "I got a 24". */
export function readScores(text: string, range: { min: number; max: number; step?: number }): { current?: number; target?: number } | undefined {
  const small = range.max < 100
  const step = range.step ?? (small ? 1 : 10)
  const inRange = (n: number) => n >= range.min && n <= range.max && (n - range.min) % step === 0
  const num = (m: RegExpMatchArray | null) => { const n = m ? Number(m[1]) : NaN; return inRange(n) ? n : undefined }
  const d = small ? '(\\d{1,2})' : '(\\d{3})'
  const current = num(text.match(new RegExp(`\\b(?:got|scored|score(?:d)?\\s+(?:of|was|is)|have|had|at|currently|from|last time\\D{0,20})\\s*(?:a|an)?\\s*${d}\\b`, 'i')))
    ?? num(text.match(new RegExp(`\\b${d}\\s*(?:on|in)\\s+(?:my|the)\\s+(?:last|first|practice|real)?\\s*(?:sat|psat|act|gre|gmat|lsat|mcat|test)`, 'i')))
  const target = num(text.match(new RegExp(`\\b(?:to|toward|towards|reach|hit|get to|aiming for|aim for|going for|goal(?: of| is)?|want(?:ed)?(?: to get)?|up to|target(?:ing)?)\\s*(?:a|an|as close to)?\\s*${d}\\b`, 'i')))
  if (!current && !target) return undefined
  return { ...(current ? { current } : {}), ...(target && target !== current ? { target } : {}) }
}

/**
 * Which exam (and which of its domains) a request is about, from everything
 * the learner typed: topic, request, extra instructions, the plan unit.
 * `subject` is the picked subject value ('mathematics', 'english', ...).
 */
export type SavedScores = Record<string, { current?: number; target?: number }>

export function detectExam(text: string, subject?: string | null, saved?: SavedScores | null): ExamMatch | null {
  const t = text.trim()
  if (!t) return null
  const build = (profile: ExamProfile): ExamMatch => {
    const domains = profile.domains.filter((d) => d.detect.test(t))
    // A score stated in this request wins; else the one saved on the account for this test.
    const score = (profile.scoreRange ? readScores(t, profile.scoreRange) : undefined) ?? saved?.[profile.id]
    return { profile, domains, ...(score && (score.current || score.target) ? { score } : {}) }
  }
  // A section named outright ("SAT Math", "Reading and Writing") wins, whatever subject was picked.
  const explicit = EXAM_PROFILES.find((p) => p.detect.exam.test(t) && p.detect.explicit?.test(t))
  if (explicit) return build(explicit)
  for (const profile of EXAM_PROFILES) {
    const d = profile.detect
    if (!d.exam.test(t)) continue
    const subjectOk = !!subject && d.subjects.includes(subject)
    const otherSubject = !!subject && subject !== 'general' && subject !== 'test-prep' && !subjectOk
    if (otherSubject) continue
    if (d.exclude?.test(t) && !subjectOk) continue
    // The test named alone ("help me with the SAT") with nothing pointing at this section: not assumed.
    if (!subjectOk && !d.subjectHints?.test(t)) continue
    return build(profile)
  }
  return null
}

/**
 * The prompt block for a matched exam. Goes in the cached system block:
 * it depends only on the exam, the domains, the format and the difficulty.
 */
export function examInstructions(match: ExamMatch, format: string, difficulty?: string | null): string {
  const { profile } = match
  const domains = match.domains.length ? match.domains : profile.domains
  const whole = !match.domains.length
  const items = ITEM_FORMATS.has(format)
  const lines: string[] = [
    `TEST REFERENCE: this guide is for ${profile.name}. Write it the way that test is written, from the reference below, not from a textbook. The learner wants to get better at the test, so every item must be one that could appear on it.`,
    whole ? `The guide covers the whole section; weight the domains as the test does.` : `The learner asked about: ${domains.map((d) => d.name).join(', ')}. Stay inside ${domains.length === 1 ? 'that domain' : 'those domains'}.`,
  ]
  // The item rules come first: they override the format's own question mix (true/false counts, short answers).
  if (items) lines.push('', profile.itemRules, '', `These item rules replace the FORMAT section's mix of question types: no TF_QUESTION lines at all, no "I, II and III" lists, and only the item types named above.`)
  for (const d of domains) {
    lines.push('', `DOMAIN: ${d.name} (${d.share})`)
    lines.push('What it tests:')
    for (const s of d.skills) lines.push(`- ${s}`)
    lines.push('What hard looks like:')
    for (const h of d.hard) lines.push(`- ${h}`)
    lines.push(`Wrong answers are built from: ${d.traps.join('; ')}.`)
  }
  if (items) {
    lines.push('', 'EXEMPLAR ITEMS (the voice, length and difficulty to match; write new items, never these):')
    for (const d of domains) for (const e of d.exemplars) lines.push(e, '')
    const dKey = difficulty === 'hard' ? 'hard' : difficulty === 'easier' ? 'easier' : 'standard'
    lines.push(profile.difficulty[dKey])
    lines.push('', `FINAL CHECK before you output: read every item again. Delete any TF_QUESTION. Rework any item with more than one defensible answer, and any explanation that hedges ("also", "if checked carefully", "recheck", "both"): change the numbers or the options until exactly one answer is right, then write the explanation cleanly. The student sees every word of the explanation.`)
    if (match.score?.current && dKey !== 'easier') {
      const { current, target } = match.score
      lines.push(`The learner currently scores about ${current}${target ? ` and wants ${target}` : ''}. Items a ${current} student already gets right teach nothing: every item must sit at or above the ${current} level, most of them in the band just above it (the items that decide whether this student moves up), ${target && target >= 750 ? 'and at least a third from the hardest items on the test, since the goal is a top score' : 'and a third from the harder module'}.`)
    }
  } else {
    lines.push('', `Worked examples and self-checks use real test items (see the item style: four-option multiple choice or a numeric answer, short formal stems, context in 1-3 sentences). Teach each skill as a way to recognize and solve that kind of item, and name the trap the test sets. No content about the test itself (timing, modules, scoring) unless the learner asked.`)
  }
  return lines.join('\n')
}

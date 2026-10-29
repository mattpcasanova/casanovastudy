// Exam profiles: when a request is about a big standardized test we know, the
// prompt gets a reference for it (item format, the domain's skills, what hard
// looks like, the traps, exemplar items in the test's voice) instead of relying
// on the model's memory of the test. Pure: detection and prompt text only.
//
// Profiles so far: SAT Math (sat-math.ts) and SAT Reading and Writing
// (sat-rw.ts). Adding one = a profile file + an entry in EXAM_PROFILES. ACT and
// AP are next.

import type { ExamDomain, ExamProfile } from './types'
import { SAT_MATH } from './sat-math'
import { SAT_RW } from './sat-rw'

export const EXAM_PROFILES: ExamProfile[] = [SAT_MATH, SAT_RW]

/** Formats that get the full item rules and exemplars (they write test items). */
const ITEM_FORMATS = new Set(['quiz', 'practice', 'adaptive'])

export interface ExamMatch {
  profile: ExamProfile
  /** Domains the request names; empty = the whole section. */
  domains: ExamDomain[]
  /** The score the learner says they have now, and the one they want, when the request says. */
  score?: { current?: number; target?: number }
}

/** "I got a 630", "scored 650", "from 630 to 800", "going for a 750", "aiming for 700+". */
export function readScores(text: string, range: { min: number; max: number }): { current?: number; target?: number } | undefined {
  const inRange = (n: number) => n >= range.min && n <= range.max && n % 10 === 0
  const num = (m: RegExpMatchArray | null) => { const n = m ? Number(m[1]) : NaN; return inRange(n) ? n : undefined }
  const current = num(text.match(/\b(?:got|scored|score(?:d)?\s+(?:of|was|is)|have|had|at|currently|from|last time\D{0,20})\s*(?:a|an)?\s*(\d{3})\b/i))
    ?? num(text.match(/\b(\d{3})\s*(?:on|in)\s+(?:my|the)\s+(?:last|first|practice|real)?\s*(?:sat|psat|test)/i))
  const target = num(text.match(/\b(?:to|toward|towards|reach|hit|get to|aiming for|aim for|going for|goal(?: of| is)?|want(?:ed)?(?: to get)?|up to|target(?:ing)?)\s*(?:a|an|as close to)?\s*(\d{3})\b/i))
  if (!current && !target) return undefined
  return { ...(current ? { current } : {}), ...(target && target !== current ? { target } : {}) }
}

/**
 * Which exam (and which of its domains) a request is about, from everything
 * the learner typed: topic, request, extra instructions, the plan unit.
 * `subject` is the picked subject value ('mathematics', 'english', ...).
 */
export function detectExam(text: string, subject?: string | null): ExamMatch | null {
  const t = text.trim()
  if (!t) return null
  const build = (profile: ExamProfile): ExamMatch => {
    const domains = profile.domains.filter((d) => d.detect.test(t))
    const score = profile.scoreRange ? readScores(t, profile.scoreRange) : undefined
    return { profile, domains, ...(score ? { score } : {}) }
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
  for (const d of domains) {
    lines.push('', `DOMAIN: ${d.name} (${d.share})`)
    lines.push('What it tests:')
    for (const s of d.skills) lines.push(`- ${s}`)
    lines.push('What hard looks like:')
    for (const h of d.hard) lines.push(`- ${h}`)
    lines.push(`Wrong answers are built from: ${d.traps.join('; ')}.`)
  }
  if (items) {
    lines.push('', profile.itemRules)
    lines.push('', 'EXEMPLAR ITEMS (the voice, length and difficulty to match; write new items, never these):')
    for (const d of domains) for (const e of d.exemplars) lines.push(e, '')
    const dKey = difficulty === 'hard' ? 'hard' : difficulty === 'easier' ? 'easier' : 'standard'
    lines.push(profile.difficulty[dKey])
    if (match.score?.current && dKey !== 'easier') {
      const { current, target } = match.score
      lines.push(`The learner currently scores about ${current}${target ? ` and wants ${target}` : ''}. Items a ${current} student already gets right teach nothing: every item must sit at or above the ${current} level, most of them in the band just above it (the items that decide whether this student moves up), ${target && target >= 750 ? 'and at least a third from the hardest items on the test, since the goal is a top score' : 'and a third from the harder module'}.`)
    }
  } else {
    lines.push('', `Worked examples and self-checks use real test items (see the item style: four-option multiple choice or a numeric answer, short formal stems, context in 1-3 sentences). Teach each skill as a way to recognize and solve that kind of item, and name the trap the test sets. No content about the test itself (timing, modules, scoring) unless the learner asked.`)
  }
  return lines.join('\n')
}

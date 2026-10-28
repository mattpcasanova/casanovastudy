// Exam profiles: when a request is about a big standardized test we know, the
// prompt gets a reference for it (item format, the domain's skills, what hard
// looks like, the traps, exemplar items in the test's voice) instead of relying
// on the model's memory of the test. Pure: detection and prompt text only.
//
// Profiles so far: SAT Math (lib/exams/sat-math.ts). Adding one = a profile
// file + an entry in EXAM_PROFILES. SAT Reading and Writing, ACT and AP are next.

import type { ExamDomain, ExamProfile } from './types'
import { SAT_MATH } from './sat-math'

export const EXAM_PROFILES: ExamProfile[] = [SAT_MATH]

/** Formats that get the full item rules and exemplars (they write test items). */
const ITEM_FORMATS = new Set(['quiz', 'practice', 'adaptive'])

export interface ExamMatch {
  profile: ExamProfile
  /** Domains the request names; empty = the whole section. */
  domains: ExamDomain[]
}

/**
 * Which exam (and which of its domains) a request is about, from everything
 * the learner typed: topic, request, extra instructions, the plan unit.
 * `subject` is the picked subject value ('mathematics', 'english', ...).
 */
export function detectExam(text: string, subject?: string | null): ExamMatch | null {
  const t = text.trim()
  if (!t) return null
  for (const profile of EXAM_PROFILES) {
    if (!profile.detect.exam.test(t)) continue
    const mathSubject = subject === 'mathematics' || subject === 'math'
    const otherSubject = !!subject && subject !== 'general' && subject !== 'test-prep' && !mathSubject
    if (otherSubject) continue
    if (profile.detect.exclude?.test(t) && !profile.detect.subjectHints?.test(t) && !mathSubject) continue
    // "SAT" alone with no math words and no math subject: could be Reading and Writing.
    if (!mathSubject && !profile.detect.subjectHints?.test(t) && !/\bsat\s*math\b/i.test(t)) continue
    const domains = profile.domains.filter((d) => d.detect.test(t))
    return { profile, domains }
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
  } else {
    lines.push('', `Worked examples and self-checks use real test items (see the item style: four-option multiple choice or a numeric answer, short formal stems, context in 1-3 sentences). Teach each skill as a way to recognize and solve that kind of item, and name the trap the test sets. No content about the test itself (timing, modules, scoring) unless the learner asked.`)
  }
  return lines.join('\n')
}

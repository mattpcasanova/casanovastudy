// A cheap check that a multiple-choice key agrees with its own explanation.
// A real AP Chem bank had "P = ... = 0.616 atm, closest to the option listed"
// keyed to 0.410 atm with 0.615 atm sitting among the options, and another
// whose worked answer (0.600 atm) was not an option at all. Both were written
// by a quick refill call. This catches that kind of slip without a model call:
// it only speaks up when the options are numbers and the explanation works out
// a different number, or when the explanation hedges about the options.

import { parseNumber } from './numeric'

export type KeyProblem = 'hedged' | 'mismatch'

export interface KeyedChoice {
  options: string[]
  /** Index of the keyed option. */
  correct: number
  explanation?: string
}

// Wording a writer only uses when the worked answer and the options disagree.
const HEDGE = /closest to (?:the|an?) (?:option|choice|answer)|closest (?:option|choice|answer)|nearest (?:option|choice|answer)|not (?:listed|among the (?:options|choices)|one of the (?:options|choices))|none of the (?:options|choices) (?:match|is|are)|recheck (?:below|above|the (?:options|numbers))|\bwait[,:]|\bhold on\b|corrected version|\bcorrecting\b|\bcorrection to\b|intended (?:clean )?answer|\brecompute\b/i

// Notation the plain number reader would get wrong (powers of ten, fractions in LaTeX).
const HARD_NOTATION = /×\s*10|x\s*10\^|\\times\s*10|\\frac|\\sqrt|√|[⁰¹²³⁴-⁹⁻]/

const NUM = String.raw`-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|-?\.\d+`
// A number, optionally a fraction of two numbers, optionally a percent.
const VALUE = String.raw`(?:${NUM})(?:\s*/\s*(?:\d+(?:\.\d+)?))?\s*%?`

const tidy = (text: string) => text.replace(/[−–]/g, '-')

/** The readings of a written value: "60%" is 0.6 and 60, "3/5" is 0.6. */
function readings(token: string): number[] {
  const t = token.replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/\s+/g, '')
  const n = parseNumber(t)
  if (n === null) return []
  return /%$/.test(t) ? [n, n * 100] : [n]
}

const close = (a: number, b: number) => (b === 0 ? Math.abs(a) < 1e-9 : Math.abs(a - b) <= Math.abs(b) * 0.011)
const same = (a: number[], b: number[]) => a.some((x) => b.some((y) => close(x, y)))

/** Every value written in the text, plus the plain numbers inside fractions. */
function valuesIn(text: string): number[][] {
  const out: number[][] = []
  for (const m of text.matchAll(new RegExp(VALUE, 'g'))) out.push(readings(m[0]))
  for (const m of text.matchAll(new RegExp(NUM, 'g'))) out.push(readings(m[0]))
  return out.filter((r) => r.length)
}

/** The value the explanation arrives at: the last one that follows an equals sign. */
function workedResult(explanation: string): number[] | null {
  let result: number[] | null = null
  for (const m of explanation.matchAll(new RegExp(String.raw`[=≈]\s*\$?\s*(${VALUE})`, 'g'))) {
    const r = readings(m[1])
    if (r.length) result = r
  }
  return result
}

/**
 * 'hedged' when the explanation says the answer isn't quite among the options;
 * 'mismatch' when every option is a number, the explanation works out a number,
 * and the keyed option is neither that number nor mentioned anywhere in the
 * explanation. Null when the key looks fine or can't be judged this way.
 */
export function keyProblem(q: KeyedChoice): KeyProblem | null {
  const explanation = tidy(q.explanation ?? '')
  if (!explanation || q.correct < 0 || q.correct >= q.options.length) return null
  if (HEDGE.test(explanation)) return 'hedged'
  if (q.options.length < 2 || HARD_NOTATION.test(explanation) || q.options.some((o) => HARD_NOTATION.test(o))) return null

  const options = q.options.map((o) => tidy(o).trim())
  if (options.some((o) => !/^[-$]?\s*\.?\d/.test(o))) return null
  const values = options.map((o) => parseNumber(o))
  if (values.some((v) => v === null)) return null
  if (new Set(values).size !== values.length) return null

  const result = workedResult(explanation)
  if (!result) return null
  const keyed = readings((options[q.correct].match(new RegExp(`^[-$]?\\s*(?:${VALUE})`)) ?? [''])[0].replace('$', ''))
  if (!keyed.length || same(result, keyed)) return null
  // The keyed value shows up in the working (the last "=" was a side step): leave it alone.
  if (valuesIn(explanation).some((v) => same(v, keyed))) return null
  return 'mismatch'
}

/** The same check for a question answered with a number: the working must arrive at one of the accepted answers. */
export function numberKeyProblem(q: { answers: string[]; explanation?: string }): KeyProblem | null {
  const explanation = tidy(q.explanation ?? '')
  if (!explanation || !q.answers.length) return null
  if (HEDGE.test(explanation)) return 'hedged'
  if (HARD_NOTATION.test(explanation) || q.answers.some((a) => HARD_NOTATION.test(a))) return null
  const accepted = q.answers.map((a) => readings(tidy(a))).filter((r) => r.length)
  if (accepted.length !== q.answers.length) return null
  const result = workedResult(explanation)
  if (!result || accepted.some((a) => same(result, a))) return null
  if (valuesIn(explanation).some((v) => accepted.some((a) => same(v, a)))) return null
  return 'mismatch'
}

/** One check for any graded question shape (mc by index, num by accepted answers; others pass). */
export function questionKeyProblem(q: { type: string; options: string[]; correct: number; answers: string[]; explanation?: string }): KeyProblem | null {
  if (q.type === 'mc') return keyProblem(q)
  if (q.type === 'num') return numberKeyProblem(q)
  return null
}

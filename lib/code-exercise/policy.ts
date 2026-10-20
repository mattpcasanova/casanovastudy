// When guides get runnable "write the code" exercises, and in which language.
// Pure and unit-tested. Like visualsRelevant (lib/formats/figures.ts): the
// homepage only shows the "Include code editor" switch when this says the
// topic is programming in a language the browser can run (Python, JavaScript).

import type { RunnableLang } from './format'

export interface CodeContext {
  subject?: string | null
  goal?: string | null
  /** Title, topic focus, the learner's request and (a slice of) the materials. */
  text?: string | null
}

/** Formats that can hold exercises (quiz/flashcards/adaptive/cheatsheet can't). */
export const CODE_EDITOR_FORMATS = new Set(['practice', 'outline', 'summary', 'custom'])

const RUNNABLE = /\bpython\b|\bjavascript\b|\bjs\b|\bnode\.?js\b|\bpandas\b|\bnumpy\b/i
const JAVASCRIPT = /\bjavascript\b|\bjs\b|\bnode\.?js\b|\breact\b|\bweb dev/i
// Languages the browser can't run. "Java" never matches "JavaScript" (\b).
const OTHER_LANGS = /\bjava\b|\bc\+\+|\bc#|\bcsharp\b|\bgolang\b|\brust\b|\bswift\b|\bkotlin\b|\bruby\b|\bphp\b|\bsql\b|\bhtml\b|\bcss\b|\bmatlab\b|\bap (cs ?a|computer science a)\b|\bscala\b|\bhaskell\b|\btypescript\b/i
// Clearly about programming, whatever the subject field says.
const CODING = /\bprogramming\b|\bcoding\b|\bcode\b|\bleetcode\b|\balgorithms?\b|data structures?|\brecursion\b|\brecursive\b|linked lists?|hash ?(maps?|tables?)|binary search|big.?o\b|time complexity|sorting algorithms?|object.oriented|\boop\b|ap csp|computer science principles|\bcs ?50\b|intro(duction)? to (cs|computer science)|software engineer|technical interview|coding interview/i
// Generic words that only mean code when the subject is computer science.
const CS_WORDS = /\bloops?\b|\barrays?\b|\blists?\b|\bfunctions?\b|\bvariables?\b|\bstrings?\b|\bconditionals?\b|\bdictionar(y|ies)\b|\bclasses\b|\bobjects?\b/i

export function wantsCodeExercises({ subject, goal, text }: CodeContext): boolean {
  const s = (subject ?? '').toLowerCase()
  const t = text ?? ''
  if (OTHER_LANGS.test(t) && !RUNNABLE.test(t)) return false
  if (RUNNABLE.test(t)) return true
  if (s === 'computer-science') return true
  if (CODING.test(t)) return true
  if (goal === 'interview' && /\bcod(e|ing)\b|software|developer|engineer/i.test(t)) return true
  return CS_WORDS.test(t) && /\bcomputer|\bcs\b|programm/i.test(t)
}

/** Whether the "Include code editor" switch matters for this request. */
export function codeEditorRelevant(ctx: CodeContext & { format?: string | null }): boolean {
  if (ctx.format && !CODE_EDITOR_FORMATS.has(ctx.format)) return false
  if (!(ctx.text ?? '').trim() && !ctx.subject) return false
  return wantsCodeExercises(ctx)
}

/** Python unless the topic is JavaScript. */
export function exerciseLanguage(text: string | null | undefined): RunnableLang {
  const t = text ?? ''
  return JAVASCRIPT.test(t) && !/\bpython\b/i.test(t) ? 'javascript' : 'python'
}

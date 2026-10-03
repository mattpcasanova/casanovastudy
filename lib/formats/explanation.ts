// Feedback-box explanations: show how to get the answer, put the tour of the
// wrong options behind "More". Older guides (and hard quizzes before
// 2026-10-03) wrote whole paragraphs that walked through every option.

const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-Z0-9$("“\-−])/
// Sentences about why other options are wrong.
const WRONG_OPTION = /^(the )?(other|wrong|remaining) (choices|options|answers)|^(choosing|picking|selecting)\b|^if you (picked|chose|choose|selected)\b|^(choice|option|answer) [A-D]\b|^[A-D]\)? (is|comes|uses|gives|would|treats|confuses|forgets|mixes)\b|^common (errors|mistakes|traps)|^(a|the) (common )?(trap|mistake|error)\b/i

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

export function splitExplanation(text: string, maxWords = 45): { short: string; rest: string } {
  const t = text.trim()
  if (words(t) <= 40) return { short: t, rest: '' }
  const sentences = t.split(SENTENCE_BREAK)
  // Prefer the natural cut: everything before the first wrong-option sentence.
  const cut = sentences.findIndex((s, i) => i > 0 && WRONG_OPTION.test(s))
  if (cut > 0) return { short: sentences.slice(0, cut).join(' '), rest: sentences.slice(cut).join(' ') }
  // Otherwise whole sentences up to the word budget (at least one).
  let i = 1
  while (i < sentences.length && words(sentences.slice(0, i + 1).join(' ')) <= maxWords) i++
  if (i >= sentences.length || words(sentences.slice(i).join(' ')) < 8) return { short: t, rest: '' }
  return { short: sentences.slice(0, i).join(' '), rest: sentences.slice(i).join(' ') }
}

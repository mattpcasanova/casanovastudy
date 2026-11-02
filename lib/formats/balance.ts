// Spreads the correct answers of multiple-choice items evenly over A, B, C, D.
// The model writing a guide doesn't: over 1,600 recent quiz questions the key was
// A 21%, B 31%, C 31%, D 17%, and in a single quiz one letter often dominates.
// Applied when a guide is read (quiz and practice parsers), so older guides are
// fixed too. Players check answers by option text, so reordering is safe for
// saved runs; letter references in explanations ("Option B confuses...", "(C)")
// are relabeled to match.

/** Seeded random numbers in [0, 1) (FNV-1a hash + xorshift-style mix). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/** Short stable fingerprint of a string (used as a seed). */
export function fingerprint(s: string): string {
  let h = 2166136261
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619)
  return (h >>> 0).toString(36)
}

const REFERS_TO_OTHERS = /\b(?:all|none|both|neither)\s+(?:of\s+)?(?:the\s+)?(?:above|these|answers|choices|options)\b/i
const NAMES_LETTERS = /\b[A-F]\s*(?:,|and|or|&)\s*[A-F]\b|\b(?:[Oo]nly|[Cc]hoices?|[Oo]ptions?)\s+\(?[A-F]\)?(?=\s|$|[.,)])/

/** Options that point at other options ("All of the above", "A and C") must keep their order. */
export function canReorder(options: string[]): boolean {
  return options.length >= 3 && !options.some((o) => REFERS_TO_OTHERS.test(o) || NAMES_LETTERS.test(o)) && !inNumberOrder(options)
}

/** Numeric options listed in order (as real tests list them) stay in order. */
function inNumberOrder(options: string[]): boolean {
  const nums = options.map((o) => {
    const t = o.replace(/[$,%\s]|[a-z]+\.?$/gi, '').replace(/[−–]/g, '-')
    const f = t.match(/^(-?\d*\.?\d+)\/(\d*\.?\d+)$/)
    return f ? Number(f[1]) / Number(f[2]) : /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN
  })
  if (nums.some((n) => !Number.isFinite(n))) return false
  const up = nums.every((n, i) => i === 0 || n >= nums[i - 1])
  const down = nums.every((n, i) => i === 0 || n <= nums[i - 1])
  return up || down
}

export interface ChoiceSlot { options: string[]; correct: number }
/** `order[k]` = the original index of the option now at position k. */
export interface Reordered { options: string[]; correct: number; order: number[] }

/**
 * Picks a position for each item's correct answer so positions come out even
 * (least-used position first, no letter three times in a row, ties broken by the
 * seed) and shuffles the other options around it. Null slots and items that
 * can't be reordered are left alone (but their position still counts).
 */
export function balanceChoices(slots: Array<ChoiceSlot | null>, seed: string): Array<Reordered | null> {
  const rand = seededRandom(`balance:${seed}`)
  const used: number[] = []
  const recent: number[] = []
  return slots.map((slot) => {
    if (!slot || slot.correct < 0 || slot.correct >= slot.options.length) return null
    const n = slot.options.length
    for (let i = used.length; i < n; i++) used.push(0)
    if (!canReorder(slot.options)) {
      used[slot.correct]++
      recent.push(slot.correct)
      return null
    }
    const triple = recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2] ? recent[recent.length - 1] : -1
    const candidates = Array.from({ length: n }, (_, i) => i).filter((i) => i !== triple)
    const fewest = Math.min(...candidates.map((i) => used[i]))
    const best = candidates.filter((i) => used[i] === fewest)
    const target = best[Math.floor(rand() * best.length)]
    const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== slot.correct)
    for (let k = others.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1))
      ;[others[k], others[j]] = [others[j], others[k]]
    }
    const order: number[] = []
    for (let k = 0, o = 0; k < n; k++) order.push(k === target ? slot.correct : others[o++])
    used[target]++
    recent.push(target)
    return { options: order.map((i) => slot.options[i]), correct: target, order }
  })
}

const LETTER_WORDS = '(?:options?|choices?|answers?|letters?|choos(?:e|es|ing)|chose|pick(?:s|ed|ing)?|select(?:s|ed|ing)?)'
const VERBS = '(?:is|was|would|could|might|confuses|reverses|uses|gives|forgets|ignores|mixes|describes|treats|shows|states|assumes|adds|subtracts|multiplies|divides|comes|results|reflects|matches|represents|reads|swaps|misreads|incorrectly|wrongly|only|also)'

/** Rewrites letter references ("Option B", "(C)", "A and D", "B is wrong") after a reorder. */
export function relabel(text: string | undefined, order: number[]): string | undefined {
  if (!text || order.every((o, k) => o === k)) return text
  const newPos: Record<string, string> = {}
  order.forEach((orig, k) => { newPos[String.fromCharCode(65 + orig)] = String.fromCharCode(65 + k) })
  const swap = (l: string) => newPos[l] ?? l
  const swapAll = (s: string) => s.replace(/\b([A-F])\b/g, (m, l: string) => swap(l))
  return text
    // "Option B", "choices A and C", "choosing (D)"
    .replace(new RegExp(`\\b${LETTER_WORDS}\\s+\\(?[A-F]\\)?(?:\\s*(?:,|and|or|&)\\s*\\(?[A-F]\\)?)*`, 'gi'), (m) => {
      const head = m.match(new RegExp(`^${LETTER_WORDS}\\s+`, 'i'))?.[0] ?? ''
      return head + swapAll(m.slice(head.length))
    })
    // "(B)", "(A, E)" on their own
    .replace(/\(([A-F](?:\s*(?:,|and|or)\s*[A-F])*)\)/g, (m, letters: string) => `(${swapAll(letters)})`)
    // "B is wrong because", "A and C both ..." at the start of a sentence
    .replace(new RegExp(`(^|[.;:!?]\\s+|\\n)([A-F](?:\\s*(?:,|and|or)\\s*[A-F])*)(?=\\s+${VERBS}\\b)`, 'g'), (m, lead: string, letters: string) => lead + swapAll(letters))
}

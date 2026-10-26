// Read aloud with the browser's own voices (speechSynthesis): free, works
// offline, and speaks every guide language. One utterance at a time across
// the page; starting another stops the first.

/** Guide text (markdown, LaTeX, figure fences) as something a voice can say. */
export function textForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ') // code, graphs and other fences
    .replace(/~~~~[\s\S]*?~~~~/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links keep their words
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, tex: string) => ` ${latexForSpeech(tex)} `)
    .replace(/\{\{([^}|]*)(\|[^}]*)?\}\}/g, ' blank ') // fill-in blanks
    .replace(/_{3,}/g, ' blank ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>~]/g, '')
    .replace(/²/g, ' squared').replace(/³/g, ' cubed')
    .replace(/\s+/g, ' ')
    .trim()
}

function latexForSpeech(tex: string): string {
  let t = tex
  // Innermost first so nested fractions read in order.
  for (let i = 0; i < 4; i++) {
    t = t
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, ' $1 over $2 ')
      .replace(/\\sqrt\{([^{}]*)\}/g, ' the square root of $1 ')
  }
  return t
    .replace(/\\(?:bar|overline)\{([^{}]*)\}/g, '$1 bar')
    .replace(/\\hat\{([^{}]*)\}/g, '$1 hat')
    .replace(/\^\{?2\}?/g, ' squared').replace(/\^\{?3\}?/g, ' cubed')
    .replace(/\^\{([^{}]*)\}|\^(\w)/g, (_, a, b) => ` to the power ${a ?? b} `)
    .replace(/_\{([^{}]*)\}|_(\w)/g, (_, a, b) => ` sub ${a ?? b} `)
    .replace(/\\(?:times|cdot)/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\pm/g, ' plus or minus ')
    .replace(/\\(?:leq|le)\b/g, ' less than or equal to ')
    .replace(/\\(?:geq|ge)\b/g, ' greater than or equal to ')
    .replace(/\\neq/g, ' not equal to ')
    .replace(/\\(?:rightarrow|to)\b/g, ' yields ')
    .replace(/\\pi/g, ' pi ').replace(/\\theta/g, ' theta ').replace(/\\Delta/g, ' delta ')
    .replace(/\\(?:mathrm|text|textbf|mathbf)\{([^{}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, '')
}

/** A question and its options as one passage: "Question. A: …. B: …." */
export function questionForSpeech(question: string, options?: string[]): string {
  const q = textForSpeech(question)
  if (!options?.length) return q
  const letters = 'ABCDEFGH'
  const parts = [q, ...options.map((o, i) => `${letters[i] ?? i + 1}: ${textForSpeech(o)}`)]
  return parts.map((p, i) => (i < parts.length - 1 && !/[.?!:;]$/.test(p) ? `${p}.` : p)).join(' ')
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

// Prefer the better-sounding voices browsers ship (Enhanced/Premium on Apple, Google/Natural elsewhere).
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const base = lang.slice(0, 2).toLowerCase()
  const same = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(base))
  if (!same.length) return null
  const exact = same.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang.toLowerCase())
  const pool = exact.length ? exact : same
  return pool.find((v) => /premium|enhanced|natural|neural/i.test(v.name)) ?? pool.find((v) => /google/i.test(v.name)) ?? pool.find((v) => v.default) ?? pool[0]
}

let current: SpeechSynthesisUtterance | null = null
const listeners = new Set<(id: string | null) => void>()
let speakingId: string | null = null

function setSpeaking(id: string | null) {
  speakingId = id
  listeners.forEach((fn) => fn(id))
}

/** Which button is speaking now (null = none); for showing a Stop state. */
export function onSpeakingChange(fn: (id: string | null) => void): () => void {
  listeners.add(fn)
  fn(speakingId)
  return () => { listeners.delete(fn) }
}

export function stopSpeaking() {
  if (!speechSupported()) return
  current = null
  window.speechSynthesis.cancel()
  setSpeaking(null)
}

export function speak(id: string, text: string, opts: { lang: string; rate?: number }) {
  if (!speechSupported() || !text.trim()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = opts.lang
  u.rate = opts.rate ?? 1
  const voice = pickVoice(opts.lang)
  if (voice) u.voice = voice
  u.onend = u.onerror = () => { if (current === u) { current = null; setSpeaking(null) } }
  current = u
  setSpeaking(id)
  window.speechSynthesis.speak(u)
}

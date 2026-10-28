// Numeric answer matching shared by adaptive practice (num questions) and quiz
// NUM_QUESTION items (student-produced responses, as on the SAT).

/** "3.5", "-2", "7/2", "1,200", "45%", "x = 4", "4 cm" → number, else null. */
export function parseNumber(raw: string): number | null {
  let s = raw.trim().toLowerCase()
    .replace(/^[a-z]\w*\s*=\s*/, '') // "x = 4"
    .replace(/[−–]/g, '-')
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/\s+/g, ' ')
  const pct = /%\s*$/.test(s)
  s = s.replace(/%\s*$/, '').replace(/^\$/, '').trim()
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/)
  let n: number
  if (frac) {
    const den = Number(frac[2])
    if (!den) return null
    n = Number(frac[1]) / den
  } else {
    const m = s.match(/^-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/)
    if (!m) return null
    n = Number(m[0])
  }
  if (!Number.isFinite(n)) return null
  return pct ? n / 100 : n
}

/** Numeric answers: within 1% (or 0.001 when the answer is 0); "45%" also matches 0.45 and 45. */
export function isNumberCorrect(given: string, answers: string[]): boolean {
  const g = parseNumber(given)
  if (g === null) return false
  const gRaw = Number(given.replace(/[^\d.\-]/g, ''))
  return answers.some((a) => {
    const n = parseNumber(a)
    if (n === null) return false
    const close = (x: number) => (n === 0 ? Math.abs(x) <= 1e-3 : Math.abs(x - n) <= Math.abs(n) * 0.01)
    return close(g) || (/%/.test(a) && Number.isFinite(gRaw) && close(gRaw / 100))
  })
}

// Shared bits for the ```graph kinds that live outside spec.ts.

export interface CommonFields { title?: string; caption?: string; xLabel?: string; yLabel?: string; notes: string[] }
export type Line = { key: string; value: string; raw: string }

export const pipes = (v: string) => v.split('|').map((p) => p.trim())
export const falsy = (v: string) => /^(hide|hidden|off|no|none|false)$/i.test(v.trim())

/** "12", "−3.5", "1,200", "40%", "0.1 M", "25 mL", "1/4" → a number (null when it isn't one). */
export function num(v: string | undefined): number | null {
  if (!v) return null
  const t = v.trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}\b)/g, '').replace(/\s*(%|m|ml|l|v|volts?|ohms?|Ω|°c?|°|g|mol)$/i, '')
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2])
  return /^-?\d*\.?\d+(e-?\d+)?$/i.test(t) ? Number(t) : null
}

/** A value after an optional "name:" inside a pipe part: "pKa: 4.76" or "pKa 4.76" → 4.76. */
export function named(parts: string[], name: RegExp): number | null {
  for (const p of parts) {
    const m = p.match(new RegExp(`^(?:${name.source})\\s*[:=]?\\s*(.+)$`, 'i'))
    if (m) return num(m[1])
  }
  return null
}

/** Trims trailing float noise: 0.30000000000000004 → "0.3"; keeps at most `places` decimals. */
export function tidy(n: number, places = 4): string {
  if (!Number.isFinite(n)) return '?'
  const r = Number(n.toFixed(places))
  return String(Object.is(r, -0) ? 0 : r)
}

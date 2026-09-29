// Element data for chemistry figures: valence electrons (for formal charges),
// CPK-style colors and relative radii (for ball-and-stick models).

export interface ElementInfo { valence: number; color: string; radius: number; text: string }

const E = (valence: number, color: string, radius: number, text = '#0f172a'): ElementInfo => ({ valence, color, radius, text })

export const ELEMENTS: Record<string, ElementInfo> = {
  H: E(1, '#f8fafc', 0.55),
  He: E(2, '#a5f3fc', 0.6),
  Li: E(1, '#c084fc', 0.9, '#fff'),
  Be: E(2, '#a3e635', 0.8),
  B: E(3, '#fdba74', 0.8),
  C: E(4, '#475569', 0.8, '#fff'),
  N: E(5, '#3b82f6', 0.78, '#fff'),
  O: E(6, '#ef4444', 0.76, '#fff'),
  F: E(7, '#86efac', 0.72),
  Ne: E(8, '#a5f3fc', 0.7),
  Na: E(1, '#a855f7', 1.0, '#fff'),
  Mg: E(2, '#4ade80', 0.95),
  Al: E(3, '#cbd5e1', 0.95),
  Si: E(4, '#d6b48a', 0.95),
  P: E(5, '#f97316', 0.92, '#fff'),
  S: E(6, '#facc15', 0.92),
  Cl: E(7, '#22c55e', 0.9, '#fff'),
  Ar: E(8, '#67e8f9', 0.9),
  K: E(1, '#9333ea', 1.1, '#fff'),
  Ca: E(2, '#16a34a', 1.05, '#fff'),
  Ga: E(3, '#94a3b8', 1.0),
  Ge: E(4, '#94a3b8', 1.0),
  As: E(5, '#c084fc', 1.0, '#fff'),
  Se: E(6, '#fb923c', 1.0),
  Br: E(7, '#b45309', 1.0, '#fff'),
  Kr: E(8, '#5eead4', 1.0),
  Sn: E(4, '#94a3b8', 1.1),
  Sb: E(5, '#a78bfa', 1.1, '#fff'),
  Te: E(6, '#d97706', 1.1, '#fff'),
  I: E(7, '#7e22ce', 1.1, '#fff'),
  Xe: E(8, '#2dd4bf', 1.1),
}

const FALLBACK: ElementInfo = E(0, '#f472b6', 0.9)

/** Normalizes "cl" / "CL" → "Cl". */
export function normalizeSymbol(s: string): string {
  const t = s.trim()
  return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : t
}

export function elementInfo(symbol: string): ElementInfo {
  return ELEMENTS[normalizeSymbol(symbol)] ?? FALLBACK
}

export function isElement(symbol: string): boolean {
  return normalizeSymbol(symbol) in ELEMENTS
}

// Where each answer sits on a student's paper, so the marks can be put on the
// page for the teacher (she drags any that land wrong). One model call per
// paper reads the pages and gives, per question, the page and how far down the
// student's answer ends. Pure helpers here are unit-tested; the call is in
// locate-server.ts.

import type { GradedQuestion } from './parse'
import { placeStamp, pointsOf, type StampPlace } from './mark-points'

/** "Question 1(a)" and "1a" are the same question. */
const looseKey = (label: string) => label.toLowerCase().replace(/^(?:question|q\.?)\s*/, '').replace(/[^a-z0-9]/g, '')

export interface AnswerPosition { question: string; page: number; y: number }

/** The model's reply ({"positions": [{"q": "1(a)", "page": 1, "y": 0.31}]}) as positions on the paper's pages. */
export function parsePositions(text: string, pageCount: number): AnswerPosition[] {
  const start = text.indexOf('{'), end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return []
  try {
    const json = JSON.parse(text.slice(start, end + 1)) as { positions?: unknown }
    if (!Array.isArray(json.positions)) return []
    const out: AnswerPosition[] = []
    for (const item of json.positions) {
      const r = item as Record<string, unknown>
      const question = String(r.q ?? r.question ?? '').trim().slice(0, 50)
      const page = Number(r.page), y = Number(r.y)
      if (!question || !Number.isInteger(page) || page < 1 || page > pageCount || !(y >= 0 && y <= 1)) continue
      out.push({ question, page, y: Math.round(y * 1000) / 1000 })
    }
    return out
  } catch {
    return []
  }
}

/** Right-margin places for a question's marks: its points side by side at the answer's height, left of the edge. */
export function marginPlaces(count: number, page: number, y: number): StampPlace[] {
  const step = 0.075
  const right = 0.93
  return Array.from({ length: count }, (_, k) => ({ page, x: Math.max(0.4, Math.round((right - (count - 1 - k) * step) * 10000) / 10000), y }))
}

/**
 * Put every marked question's marks on the paper at the position found for it.
 * Marks already on the paper stay where the teacher put them; questions the
 * model couldn't find are left alone. Returns the breakdown and how many
 * questions got their marks placed.
 */
export function placeAtPositions(breakdown: GradedQuestion[], positions: AnswerPosition[]): { breakdown: GradedQuestion[]; placed: number; missing: string[] } {
  const byKey = new Map(positions.map((p) => [looseKey(p.question), p]))
  let out = breakdown
  let placed = 0
  const missing: string[] = []
  breakdown.forEach((q, qi) => {
    if (q.unmarked) return
    const pos = byKey.get(looseKey(q.questionNumber))
    if (!pos) { missing.push(q.questionNumber); return }
    const points = pointsOf(q)
    if (points.length) {
      // Keep points the teacher already placed; fill in the rest beside them.
      const places = marginPlaces(points.length, pos.page, pos.y)
      let changed = false
      points.forEach((p, pi) => { if (!p.at) { out = placeStamp(out, { question: qi, point: pi }, places[pi]); changed = true } })
      if (changed) placed++
    } else if (!q.at) {
      out = placeStamp(out, { question: qi, point: null }, marginPlaces(1, pos.page, pos.y)[0])
      placed++
    }
  })
  return { breakdown: out, placed, missing }
}

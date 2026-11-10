// Writing and literature figures for ```graph fences.
//
// kind: annotated   part: Claim | Schools should start later.
//                   part: Evidence | A 2014 study found ...
//                   part: Reasoning | Because teens need ...
//   A paragraph (or an essay plan, a lab conclusion, a proof) with every piece
//   named. The same role gets the same color, so a student sees the pattern.
// kind: plot        exposition: ...   rising: ... (up to 3)   climax: ...
//                   falling: ...   resolution: ...
//   A story arc; the app draws the mountain and numbers the points.

import { pipes, type CommonFields, type Line } from './lines'

export interface AnnotatedSpec extends CommonFields { kind: 'annotated'; parts: Array<{ role: string; text: string; tone: number }>; roles: string[] }
export interface PlotSpec extends CommonFields { kind: 'plot'; points: Array<{ stage: PlotStage; text: string }> }
export type PlotStage = 'exposition' | 'rising' | 'climax' | 'falling' | 'resolution'
export type TextSpec = AnnotatedSpec | PlotSpec

export const TEXT_LIMITS = { parts: 12, chars: 420 }

export function parseAnnotated(ls: Line[], c: CommonFields, w: string[]): AnnotatedSpec | string {
  const parts: AnnotatedSpec['parts'] = []
  const roles: string[] = []
  for (const { key, value, raw } of ls) {
    if (key === 'part' || key === 'sentence' || key === 'piece' || key === 'section') {
      const bits = pipes(value)
      const role = bits[0]
      const text = bits.slice(1).join(' | ').trim()
      if (!role || !text) { w.push(`Bad part "${raw}"`); continue }
      const name = role.toLowerCase()
      if (!roles.some((r) => r.toLowerCase() === name)) roles.push(role)
      if (parts.length < TEXT_LIMITS.parts) parts.push({ role, text: text.slice(0, TEXT_LIMITS.chars), tone: roles.findIndex((r) => r.toLowerCase() === name) })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (parts.length < 2) return 'An annotated text needs at least two "part: Role | text" lines'
  return { ...c, kind: 'annotated', parts, roles }
}

const STAGES: Record<string, PlotStage> = {
  exposition: 'exposition', setting: 'exposition', beginning: 'exposition', introduction: 'exposition',
  rising: 'rising', 'rising-action': 'rising', conflict: 'rising', 'inciting-incident': 'rising',
  climax: 'climax', 'turning-point': 'climax',
  falling: 'falling', 'falling-action': 'falling',
  resolution: 'resolution', denouement: 'resolution', ending: 'resolution',
}
const ORDER: PlotStage[] = ['exposition', 'rising', 'climax', 'falling', 'resolution']
export const STAGE_NAMES: Record<PlotStage, string> = { exposition: 'Exposition', rising: 'Rising action', climax: 'Climax', falling: 'Falling action', resolution: 'Resolution' }

export function parsePlot(ls: Line[], c: CommonFields, w: string[]): PlotSpec | string {
  const points: PlotSpec['points'] = []
  for (const { key, value, raw } of ls) {
    const stage = STAGES[key]
    if (stage) {
      if (!value.trim()) { w.push(`Bad line "${raw}"`); continue }
      if (points.filter((p) => p.stage === stage).length < (stage === 'rising' ? 3 : stage === 'falling' ? 2 : 1)) points.push({ stage, text: value.trim().slice(0, 200) })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!points.some((p) => p.stage === 'climax') || points.length < 3) return 'A plot diagram needs a climax: and at least two other stages'
  // Whatever order they were written in, the arc runs exposition → resolution.
  points.sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage))
  return { ...c, kind: 'plot', points }
}

export function describeText(spec: TextSpec): string {
  if (spec.kind === 'annotated') return `Annotated text: ${spec.parts.map((p) => `${p.role}: ${p.text}`).join(' ')}`
  return `Plot diagram: ${spec.points.map((p) => `${STAGE_NAMES[p.stage]}: ${p.text}`).join('; ')}.`
}

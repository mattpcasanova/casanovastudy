// Parser for the "plan" study-guide format — a roadmap that breaks a big goal
// (the SAT, a coding interview, a certification) into units. Each unit can be
// turned into its own guide; those guides point back via
// study_guides.parent_guide_id + plan_unit (= PlanUnit.key).
//
// Output contract (see the plan skeleton in lib/claude-api.ts):
//   # <Plan title>
//   *<description>*
//   ## Overview            (free markdown)
//   ## Phase 1: <name>
//   UNIT: <title>
//   GOAL: <one sentence>
//   COVERS: <topic>; <topic>; <topic>
//   FORMAT: outline | flashcards | quiz | summary | practice | cheatsheet | timeline
//   TIME: <e.g. 45 min>
//   ## Tips                (free markdown)

import { stripEmoji, toTitleCase, plainText } from './normalize'

export const PLAN_UNIT_FORMATS = ['outline', 'flashcards', 'quiz', 'summary', 'practice', 'cheatsheet', 'timeline'] as const
export type PlanUnitFormat = (typeof PLAN_UNIT_FORMATS)[number]

export interface PlanUnit {
  key: string // stable within a plan: "u1", "u2", … in document order
  number: number
  title: string
  goal: string
  covers: string[]
  format: PlanUnitFormat
  time: string
}

export interface PlanPhase {
  title: string
  units: PlanUnit[]
}

export interface PlanSection {
  title: string
  body: string // markdown
}

export interface ParsedPlan {
  title: string | null
  description: string | null
  overview: PlanSection | null
  phases: PlanPhase[]
  extras: PlanSection[] // tips etc., rendered after the phases
}

const FIELD = /^\*{0,2}(UNIT|GOAL|COVERS|FORMAT|TIME)\s*:\*{0,2}\s*(.*)$/i

const clean = (s: string) => stripEmoji(s).replace(/^\*\*\s*|\s*\*\*$/g, '').trim()

function asFormat(v: string): PlanUnitFormat {
  const f = v.toLowerCase().replace(/[^a-z]/g, '')
  if (f.startsWith('flash')) return 'flashcards'
  if (f.startsWith('quiz') || f.startsWith('test')) return 'quiz'
  if (f.startsWith('summ')) return 'summary'
  if (f.startsWith('prac') || f.startsWith('inter')) return 'practice'
  if (f.startsWith('cheat') || f.startsWith('ref')) return 'cheatsheet'
  if (f.startsWith('time') || f.startsWith('chron')) return 'timeline'
  return 'outline'
}

export function parsePlan(content: string): ParsedPlan {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const plan: ParsedPlan = { title: null, description: null, overview: null, phases: [], extras: [] }
  let unitCount = 0

  // Current container: either a phase (collects units) or a free section.
  let phase: PlanPhase | null = null
  let section: PlanSection | null = null
  let unit: PlanUnit | null = null

  const closeUnit = () => {
    if (unit && phase && unit.title) phase.units.push(unit)
    unit = null
  }
  const closeSection = () => {
    if (section && section.body.trim()) {
      if (!plan.overview && /overview|about|how to use|introduction/i.test(section.title)) plan.overview = section
      else plan.extras.push(section)
    }
    section = null
  }
  const closePhase = () => {
    closeUnit()
    if (phase && phase.units.length) plan.phases.push(phase)
    phase = null
  }

  for (const raw of lines) {
    const t = raw.trim()
    const h = t.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      const text = toTitleCase(plainText(stripEmoji(h[2])).trim())
      if (h[1].length === 1 && !plan.title) {
        plan.title = text
        continue
      }
      closePhase()
      closeSection()
      // Phases are headings that will contain UNIT lines; we decide lazily:
      // start as a phase, and fall back to a free section if no units appear.
      phase = { title: text, units: [] }
      section = { title: text, body: '' }
      continue
    }

    const f = t.match(FIELD)
    if (f && phase) {
      const key = f[1].toUpperCase()
      const value = clean(f[2])
      if (key === 'UNIT') {
        closeUnit()
        section = null // this heading is a phase, not a free section
        unitCount++
        unit = { key: `u${unitCount}`, number: unitCount, title: value, goal: '', covers: [], format: 'outline', time: '' }
      } else if (unit) {
        if (key === 'GOAL') unit.goal = value
        else if (key === 'COVERS') unit.covers = value.split(/\s*[;,]\s*/).map((c) => clean(c)).filter(Boolean)
        else if (key === 'FORMAT') unit.format = asFormat(value)
        else if (key === 'TIME') unit.time = value
      }
      continue
    }

    // Description line under the title.
    if (!phase && !section && !plan.description) {
      const italic = t.match(/^\*([^*].*[^*])\*$/) || t.match(/^_(.+)_$/)
      if (italic) {
        plan.description = italic[1].trim()
        continue
      }
    }

    if (section) section.body += (section.body ? '\n' : '') + raw
  }
  closePhase()
  closeSection()
  return plan
}

/** The topic text used to generate one unit's guide. */
export function unitStudyRequest(planTitle: string, unit: PlanUnit): string {
  const parts = [`${planTitle}, Unit ${unit.number}: ${unit.title}.`]
  if (unit.goal) parts.push(`Goal: ${unit.goal}`)
  if (unit.covers.length) parts.push(`Cover: ${unit.covers.join('; ')}.`)
  return parts.join(' ')
}

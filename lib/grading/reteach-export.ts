// A saved reteach plan as sections for lesson planners (Planbook, Planboard,
// Common Planner, Google Docs): each with simple HTML (h3/p/ul/ol/strong
// only, so pasting keeps it tidy) and plain text, plus Word blocks. Planbook
// has no API (researched 2026-10-13); pasting a section into the matching
// lesson box is the way in. Pure; unit-tested.

import type { ReteachGroup, ReteachPlanAI } from './reteach'

export type PlanDetail = 'quick' | 'standard' | 'detailed'

export interface SavedReteach {
  plan: ReteachPlanAI
  minutes: number
  detail?: PlanDetail
  focus: Array<{ name: string; pct: number }>
  groups: ReteachGroup[]
  examTitle: string | null
  className: string | null
  /** What it was written from: a graded test (default) or assigned practice. */
  source?: 'test' | 'practice'
}

export interface PlanSection {
  key: 'objectives' | 'warmup' | 'lesson' | 'groups' | 'exit' | 'followup'
  title: string
  html: string
  text: string
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ul = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '')
const ol = (items: string[]) => (items.length ? `<ol>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>` : '')
const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n')
const numbered = (items: string[]) => items.map((i, n) => `${n + 1}. ${i}`).join('\n')

export function groupLabel(g: ReteachGroup): string {
  if (g.kind === 'reteach') return `Reteach: ${g.topic}`
  if (g.kind === 'extend') return 'Extension'
  return 'More practice'
}

export function planSections(saved: SavedReteach): PlanSection[] {
  const { plan, groups } = saved
  const out: PlanSection[] = []

  out.push({
    key: 'objectives',
    title: 'Objectives',
    html: `${ul(plan.objectives)}${saved.focus.length ? `<p><strong>From the ${saved.source === 'practice' ? 'practice' : 'test'}:</strong> ${esc(saved.focus.map((f) => `${f.name} ${f.pct}%`).join(', '))}</p>` : ''}`,
    text: `${bullets(plan.objectives)}${saved.focus.length ? `\nFrom the ${saved.source === 'practice' ? 'practice' : 'test'}: ${saved.focus.map((f) => `${f.name} ${f.pct}%`).join(', ')}` : ''}`,
  })

  out.push({
    key: 'warmup',
    title: `Warm-up (${plan.warmUp.minutes} min)`,
    html: `<p>${esc(plan.warmUp.task)}</p>${plan.warmUp.lookFor ? `<p><strong>Look for:</strong> ${esc(plan.warmUp.lookFor)}</p>` : ''}`,
    text: `${plan.warmUp.task}${plan.warmUp.lookFor ? `\nLook for: ${plan.warmUp.lookFor}` : ''}`,
  })

  const ex = plan.miniLesson.workedExample
  const mis = plan.miniLesson.misconceptions
  out.push({
    key: 'lesson',
    title: `Mini-lesson (${plan.miniLesson.minutes} min)`,
    html: [
      ol(plan.miniLesson.steps),
      ex.problem ? `<p><strong>Worked example:</strong> ${esc(ex.problem)}</p>${ol(ex.solution)}` : '',
      mis.length ? `<p><strong>Common mistakes from this ${saved.source === 'practice' ? 'practice' : 'test'}</strong></p>${ul(mis.map((m) => `${m.mistake} → ${m.fix}`))}` : '',
    ].join(''),
    text: [
      numbered(plan.miniLesson.steps),
      ex.problem ? `\nWorked example: ${ex.problem}\n${numbered(ex.solution)}` : '',
      mis.length ? `\nCommon mistakes from this ${saved.source === 'practice' ? 'practice' : 'test'}:\n${bullets(mis.map((m) => `${m.mistake} → ${m.fix}`))}` : '',
    ].join(''),
  })

  const groupParts = groups.map((g) => {
    const ai = plan.groups.find((x) => x.key === g.key)
    const names = g.students.map((s) => s.name).join(', ')
    return {
      html: `<p><strong>${esc(groupLabel(g))}</strong>${ai?.minutes ? ` (${ai.minutes} min)` : ''}: ${esc(names)}</p>${ai ? `<ul><li>${esc(ai.activity)}</li>${ai.teacherMove ? `<li>Teacher: ${esc(ai.teacherMove)}</li>` : ''}</ul>` : ''}`,
      text: `${groupLabel(g)}${ai?.minutes ? ` (${ai.minutes} min)` : ''}: ${names}${ai ? `\n- ${ai.activity}${ai.teacherMove ? `\n- Teacher: ${ai.teacherMove}` : ''}` : ''}`,
    }
  })
  out.push({ key: 'groups', title: 'Small groups', html: groupParts.map((p) => p.html).join(''), text: groupParts.map((p) => p.text).join('\n\n') })

  out.push({
    key: 'exit',
    title: 'Exit ticket',
    html: `${ol(plan.exitTicket.map((q) => q.question))}<p><strong>Answers:</strong> ${esc(plan.exitTicket.map((q, i) => `${i + 1}. ${q.answer}`).join('  '))}</p>`,
    text: `${numbered(plan.exitTicket.map((q) => q.question))}\nAnswers: ${plan.exitTicket.map((q, i) => `${i + 1}. ${q.answer}`).join('  ')}`,
  })

  if (plan.followUp) out.push({ key: 'followup', title: 'Homework / follow-up', html: `<p>${esc(plan.followUp)}</p>`, text: plan.followUp })
  return out
}

/** The whole plan as one HTML block (title + every section) for "Copy all" and printing. */
export function planHtml(saved: SavedReteach): string {
  const head = `<h2>${esc(saved.plan.title || 'Reteach lesson')}</h2><p>${esc([saved.className, saved.examTitle && `after ${saved.examTitle}`, `${saved.minutes} minutes`].filter(Boolean).join(' · '))}</p>`
  return head + planSections(saved).map((s) => `<h3>${esc(s.title)}</h3>${s.html}`).join('')
}

export function planText(saved: SavedReteach): string {
  return [saved.plan.title || 'Reteach lesson', ...planSections(saved).map((s) => `${s.title.toUpperCase()}\n${s.text}`)].join('\n\n')
}

export interface DocBlock { kind: 'title' | 'subtitle' | 'heading' | 'para' | 'bullet' | 'number'; text: string; n?: number }

/** Word blocks (lib/grading/docx.ts writes them). */
export function planDocBlocks(saved: SavedReteach): DocBlock[] {
  const blocks: DocBlock[] = [
    { kind: 'title', text: saved.plan.title || 'Reteach lesson' },
    { kind: 'subtitle', text: [saved.className, saved.examTitle && `after ${saved.examTitle}`, `${saved.minutes} minutes`].filter(Boolean).join(' · ') },
  ]
  for (const s of planSections(saved)) {
    blocks.push({ kind: 'heading', text: s.title })
    let n = 0
    for (const line of s.text.split('\n')) {
      if (!line.trim()) continue
      const num = line.match(/^(\d+)\.\s+(.*)$/)
      if (num) { n = Number(num[1]); blocks.push({ kind: 'number', text: num[2], n }); continue }
      if (line.startsWith('- ')) { blocks.push({ kind: 'bullet', text: line.slice(2) }); continue }
      blocks.push({ kind: 'para', text: line })
    }
  }
  return blocks
}

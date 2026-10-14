import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseReteachPlan } from './reteach'
import { planDocBlocks, planHtml, planSections, planText, type SavedReteach } from './reteach-export'
import { toDocx } from './docx'

const raw = `Here you go: {"title":"Limiting reagent, again","objectives":["Students can find the limiting reagent"],"warmUp":{"minutes":"5","task":"4 mol H2 + 1 mol O2: which runs out?","lookFor":"Comparing moles <directly>"},"miniLesson":{"minutes":15,"steps":["Model the ratio table","Check with the class"],"workedExample":{"problem":"2 mol N2 + 3 mol H2","solution":["Need 6 mol H2","H2 is limiting"]},"misconceptions":[{"mistake":"Picked the larger number","fix":"Use the ratio"}]},"groups":[{"key":"topic-1","minutes":15,"activity":"Ratio cards","teacherMove":"Sit with them"},{"key":"extend","minutes":15,"activity":"Excess left over"}],"exitTicket":[{"question":"Which runs out?","answer":"O2"}],"followUp":"Five practice problems."}`

const saved = (): SavedReteach => ({
  plan: parseReteachPlan(raw)!,
  minutes: 50,
  focus: [{ name: 'Limiting reagent', pct: 48 }],
  groups: [
    { key: 'topic-1', kind: 'reteach', topic: 'Limiting reagent', students: [{ paperId: 'a', name: 'Ava Kim', rosterId: null, pct: 20 }] },
    { key: 'extend', kind: 'extend', topic: null, students: [{ paperId: 'b', name: 'Mya Johnson', rosterId: null, pct: 95 }] },
  ],
  examTitle: 'Stoichiometry Quiz',
  className: 'AP Chemistry',
})

describe('parseReteachPlan', () => {
  it('reads JSON wrapped in text and coerces types', () => {
    const p = parseReteachPlan(raw)!
    expect(p.warmUp.minutes).toBe(5)
    expect(p.groups[1]).toEqual({ key: 'extend', minutes: 15, activity: 'Excess left over', teacherMove: '' })
    expect(parseReteachPlan('no json')).toBeNull()
  })
})

describe('plan export', () => {
  it('makes planner sections with names only from our groups, and escapes HTML', () => {
    const sections = planSections(saved())
    expect(sections.map((s) => s.key)).toEqual(['objectives', 'warmup', 'lesson', 'groups', 'exit', 'followup'])
    expect(sections[3].text).toContain('Reteach: Limiting reagent (15 min): Ava Kim')
    expect(sections[1].html).toContain('&lt;directly&gt;')
    expect(planHtml(saved())).toMatch(/^<h2>Limiting reagent, again<\/h2>/)
    expect(planText(saved())).toContain('EXIT TICKET\n1. Which runs out?\nAnswers: 1. O2')
  })
  it('writes a Word file', async () => {
    const bytes = await toDocx(planDocBlocks(saved()))
    const xml = await (await JSZip.loadAsync(bytes)).file('word/document.xml')!.async('string')
    expect(xml).toContain('Limiting reagent, again')
    expect(xml).toContain('1.  Model the ratio table')
  })
})

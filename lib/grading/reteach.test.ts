import { describe, expect, it } from 'vitest'
import { groupsForPrompt, reteachGroups, topicScores, type ReteachPaper } from './reteach'

const q = (questionNumber: string, marksAwarded: number, marksPossible: number) => ({ questionNumber, marksAwarded, marksPossible, explanation: '' })
const paper = (name: string, a: number, b: number, c: number): ReteachPaper => ({ id: name, name, rosterId: null, breakdown: [q('1', a, 4), q('2', b, 4), q('3', c, 2)] })
const topics = [{ name: 'Moles', questions: ['1'] }, { name: 'Limiting reagent', questions: ['2'] }, { name: 'Units', questions: ['3'] }]

describe('reteach groups', () => {
  const papers = [paper('Ava', 1, 4, 2), paper('Ben', 4, 1, 2), paper('Cal', 0, 0, 2), paper('Dee', 4, 4, 2), paper('Eli', 3, 3, 2)]
  it('scores topics weakest first', () => {
    expect(topicScores(papers, topics).map((t) => [t.name, t.pct])).toEqual([['Moles', 60], ['Limiting reagent', 60], ['Units', 100]])
  })
  it('puts each student in one group by their weakest focus topic', () => {
    const { focus, groups } = reteachGroups(papers, topics)
    expect(focus.map((t) => t.name)).toEqual(['Moles', 'Limiting reagent'])
    expect(groups.map((g) => [g.kind, g.topic, g.students.map((s) => s.name)])).toEqual([
      ['reteach', 'Moles', ['Ava', 'Cal']],
      ['reteach', 'Limiting reagent', ['Ben']],
      ['practice', null, ['Eli']],
      ['extend', null, ['Dee']],
    ])
  })
  it('can focus on topics the teacher picks', () => {
    const { focus } = reteachGroups(papers, topics, ['Units'])
    expect(focus.map((t) => t.name)).toEqual(['Units'])
  })
  it('never puts names in the prompt', () => {
    const text = groupsForPrompt(reteachGroups(papers, topics).groups)
    expect(text).toContain('2 students who scored under 60% on "Moles"')
    expect(text).not.toMatch(/Ava|Ben|Cal|Dee|Eli/)
  })
})

import { describe, it, expect } from 'vitest'
import { calculatorFor, figureBudget, figurePolicy, visualsRelevant, wantsBioModels, wantsChemModels, wantsPhysicsModels } from './figures'

describe('figurePolicy', () => {
  const cases: [string | null, string, ReturnType<typeof figurePolicy>][] = [
    ['test-prep', 'SAT Math practice', 'core'],
    ['general', 'Digital SAT prep: heart of algebra and problem solving', 'core'],
    ['test-prep', 'SAT Reading and Writing', 'supporting'],
    ['mathematics', 'Geometry: similar triangles and circles', 'core'],
    ['mathematics', 'Algebra 1: slope-intercept form and graphing lines', 'core'],
    ['mathematics', 'Fractions and decimals', 'supporting'],
    ['mathematics', 'AP Statistics unit 2', 'core'],
    ['science', 'AP Physics 1 kinematics', 'core'],
    ['science', 'Cell organelles', 'supporting'],
    ['science', 'AP Chemistry unit 3', 'supporting'],
    ['history', 'American Revolution and the Stamp Act', 'rare'],
    ['english', 'The Great Gatsby themes', 'rare'],
    ['foreign-language', 'Spanish preterite vs imperfect', 'rare'],
    ['computer-science', 'Python functions and loops', 'rare'],
    ['computer-science', 'Linear regression for machine learning', 'supporting'],
    ['business', 'Supply and demand, elasticity', 'supporting'],
    ['business', 'Marketing mix 4 Ps', 'rare'],
    [null, 'Unit circle and trig identities', 'core'],
    [null, 'Photosynthesis basics', 'supporting'],
    [null, 'World War 1 causes', 'rare'],
  ]
  it.each(cases)('%s / %s → %s', (subject, text, tier) => {
    expect(figurePolicy({ subject, text })).toBe(tier)
  })

  it('does not treat the words "act" or "sat" as exams', () => {
    expect(figurePolicy({ subject: 'english', text: 'Hamlet act 3 summary' })).toBe('rare')
    expect(figurePolicy({ subject: 'history', text: 'The Stamp Act of 1765' })).toBe('rare')
  })
})

describe('calculatorFor', () => {
  it('offers graphing for math and SAT', () => {
    expect(calculatorFor({ subject: 'mathematics', text: 'Quadratics' })).toBe('graphing')
    expect(calculatorFor({ subject: 'test-prep', text: 'SAT Math' })).toBe('graphing')
  })
  it('offers scientific for chemistry', () => {
    expect(calculatorFor({ subject: 'science', text: 'Stoichiometry and molar mass' })).toBe('scientific')
  })
  it('hides it where it does not help', () => {
    expect(calculatorFor({ subject: 'history', text: 'Civil War' })).toBeNull()
    expect(calculatorFor({ subject: 'test-prep', text: 'SAT Reading and Writing' })).toBeNull()
    expect(calculatorFor({ subject: 'english', text: 'Poetry terms' })).toBeNull()
  })
  it('hides it for ACT English and Reading', () => {
    expect(calculatorFor({ subject: 'general', text: 'ACT English Practice Quiz: Pushing Past 24\nHelp me on the act english section' })).toBeNull()
    expect(calculatorFor({ subject: 'test-prep', text: 'ACT Reading: main idea and inference' })).toBeNull()
    expect(calculatorFor({ subject: 'test-prep', text: 'ACT Math: geometry' })).toBe('graphing')
  })
  it('picks scientific for computation-heavy science, graphing for graph topics', () => {
    expect(calculatorFor({ subject: 'science', text: "Newton's laws and net force" })).toBe('scientific')
    expect(calculatorFor({ subject: 'science', text: 'Kinematics: position-time and velocity-time graphs' })).toBe('graphing')
    expect(calculatorFor({ subject: 'science', text: 'AP Chemistry Unit 2: bonding' })).toBe('scientific')
    expect(calculatorFor({ subject: 'mathematics', text: 'AP Statistics: regression' })).toBe('graphing')
    expect(calculatorFor({ subject: 'general', text: 'Hard SAT Math Practice Quiz' })).toBe('graphing')
  })
  it('hides it for ACT Science (no calculator allowed)', () => {
    expect(calculatorFor({ subject: 'test-prep', text: 'ACT Science: data representation and research summaries' })).toBeNull()
  })
  it('defaults to a basic calculator for middle school', () => {
    expect(calculatorFor({ subject: 'mathematics', level: '6th-8th', text: 'Ratios and rates' })).toBe('basic')
    expect(calculatorFor({ subject: 'mathematics', text: '6th grade fractions and decimals' })).toBe('basic')
    expect(calculatorFor({ subject: 'science', level: '6th-8th', text: 'Density' })).toBe('basic')
    expect(calculatorFor({ subject: 'mathematics', level: '10th', text: 'Ratios and rates' })).toBe('graphing')
  })
})

describe('figureBudget', () => {
  it('gives a budget per format and none for item-only formats', () => {
    expect(figureBudget('core', 'quiz')).toMatch(/5-7/)
    expect(figureBudget('supporting', 'summary')).toMatch(/1-3/)
    expect(figureBudget('core', 'flashcards')).toBe('')
    expect(figureBudget('rare', 'cheatsheet')).toBe('')
  })
})

describe('wantsChemModels', () => {
  it('turns on for chemistry and biochemistry topics', () => {
    expect(wantsChemModels({ subject: 'science', text: 'AP Chemistry Unit 2: Chemical Bonding' })).toBe(true)
    expect(wantsChemModels({ subject: 'science', text: 'Lewis structures and VSEPR' })).toBe(true)
    expect(wantsChemModels({ subject: 'science', text: 'Enzymes and activation energy' })).toBe(true)
    expect(wantsChemModels({ subject: null, text: 'organic functional groups' })).toBe(true)
  })
  it('stays off elsewhere', () => {
    expect(wantsChemModels({ subject: 'science', text: 'Plate tectonics' })).toBe(false)
    expect(wantsChemModels({ subject: 'english', text: 'resonance and imagery in poetry' })).toBe(false)
    expect(wantsChemModels({ subject: 'mathematics', text: 'Quadratics' })).toBe(false)
  })
  it('chemistry topics count as at least supporting', () => {
    expect(figurePolicy({ subject: null, text: 'Lewis structures' })).toBe('supporting')
  })
})

describe('bio/physics detection and visualsRelevant', () => {
  it('detects genetics and mechanics', () => {
    expect(wantsBioModels({ subject: 'science', text: 'Mendelian genetics and pedigrees' })).toBe(true)
    expect(wantsBioModels({ subject: 'science', text: 'Photosynthesis' })).toBe(false)
    expect(wantsPhysicsModels({ subject: 'science', text: 'Newton’s laws and friction on an incline' })).toBe(true)
    expect(wantsPhysicsModels({ subject: 'history', text: 'Allied forces in WW2' })).toBe(false)
  })
  it('shows the visuals switch only when it matters', () => {
    expect(visualsRelevant({ subject: 'mathematics', text: 'Quadratics', format: 'quiz' })).toBe(true)
    expect(visualsRelevant({ subject: 'history', text: 'Civil War', format: 'outline' })).toBe(false)
    expect(visualsRelevant({ subject: 'science', text: 'Genetics', format: 'flashcards' })).toBe(false)
    expect(visualsRelevant({ subject: '', text: '', format: 'quiz' })).toBe(false)
  })
})

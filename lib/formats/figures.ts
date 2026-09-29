// How much a guide should lean on ```graph figures, and whether it gets the
// Desmos calculator. Pure and unit-tested; the prompt text that uses the tier
// lives next to the other prompt rules in lib/claude-api.ts.
//
//   core        geometry, graphing functions, statistics/data, calculus,
//               kinematics, SAT/ACT/PSAT math, AP Calc/Stats/Physics/Precalc.
//               Figures are a real part of how the subject is tested.
//   supporting  other math, the sciences, economics, SAT Reading & Writing
//               (it has chart questions). Figures only where a question is
//               inherently visual.
//   rare        everything else. A figure only if the materials contain one
//               or a question is impossible without it.

export type FigureTier = 'core' | 'supporting' | 'rare'

export interface FigureContext {
  subject?: string | null
  goal?: string | null
  /** Title, topic focus, the learner's request and (a slice of) the materials. */
  text?: string | null
}

// Topics where figures are central.
const VISUAL_TOPICS = new RegExp(
  [
    'geometr', 'trigonometr', '\\btrig\\b', 'triangle', 'circles?\\b', '\\bangles?\\b', 'polygon', 'quadrilateral', 'pythag',
    'coordinate', 'graph(s|ing|ed)?\\b', '\\bslopes?\\b', 'intercept', 'parabola', 'quadratic', 'linear (function|equation|relationship|model|inequalit)',
    '(system|systems) of (linear )?equations', 'inequalit', 'exponential (function|growth|decay|model)', 'parent function', 'function transformation',
    'transformations? of functions', 'scatter ?plot', 'histogram', 'box ?(and whisker )?plot', 'dot ?plot', 'statistic', 'data analysis',
    'regression', 'line of best fit', 'distribution', 'calculus', 'derivative', 'integral', '\\blimits?\\b', 'precalc', 'kinematic',
    'projectile', 'position.?time', 'velocity.?time', 'motion graph', 'vectors?\\b', 'supply and demand', 'unit circle', 'conic',
  ].join('|'),
  'i',
)

// Exams whose math/science sections are full of figures.
const SAT_ACT = /\b(P?SAT|ACT)\b|\b(p?sat|act) (math|prep|practice|test)\b|digital sat/ // case-sensitive acronyms: "act"/"sat" are words
const SAT_VERBAL = /reading (and|&) writing|\bR&W\b|\bgrammar\b|\bvocab/i
const SAT_MATH = /\bmath|algebra|geometr|advanced math|problem.solving|data analysis/i
const AP_CORE = /\bAP (calc|calculus|stat|statistics|physics|precalc|precalculus)/i
const AP_SUPPORT = /\bAP (chem|chemistry|bio|biology|environmental|APES|macro|micro|econ|economics)/i

const MATH_WORDS = /\bmath|algebra|arithmetic|fraction|equation|number line|ratio|percent|probability|\bSAT\b|\bACT\b/i
const SCIENCE_WORDS = /\bchem|biolog|physics|photosynth|respiration|anatom|physiolog|ecosystem|\batom|molecul|\bforces?\b|energy|astronom|geolog|climate|earth science|ecolog|genetic|cell|enzyme|reaction|stoichiometr|gas law|titration|economics|\becon\b|elasticity/i
const CHEM_WORDS = /\bchem|stoichiometr|molar|titration|gas law|equilibri|\bpH\b|thermochem|periodic/i

// Topics where Lewis structures, VSEPR shapes, energy wells, reaction energy
// diagrams or 3D molecules belong (chemistry, plus biochemistry/enzymes).
const CHEM_MODEL_TOPICS = /\bchem|lewis|vsepr|molecul|electron (geometry|domain)|hybridi[sz]|polarity|intermolecular|covalent|ionic bond|chemical bond|bonding|resonance|formal charge|potential energy (curve|well|diagram)|bond (energy|length|enthalp)|activation energy|reaction (rate|energy|mechanism|coordinate)|energy diagram|catalys|enzyme|kinetics|thermochem|enthalpy|organic|functional group|isomer|biomolecule|carbohydrate|amino acid|lipid/i

const NON_VISUAL_SUBJECTS = new Set(['english', 'history', 'foreign-language', 'arts', 'health'])

export function figurePolicy({ subject, text }: FigureContext): FigureTier {
  const s = (subject ?? '').toLowerCase()
  const t = text ?? ''
  const visual = VISUAL_TOPICS.test(t)
  const satAct = SAT_ACT.test(t) || /\bsat\b/i.test(s)

  if (satAct) {
    // SAT R&W still has "command of quantitative evidence" chart questions.
    if (SAT_VERBAL.test(t) && !SAT_MATH.test(t)) return 'supporting'
    if (s === 'english') return 'supporting'
    return 'core'
  }
  if (AP_CORE.test(t)) return 'core'
  if (AP_SUPPORT.test(t)) return 'supporting'

  if (s === 'computer-science') return /statistic|regression|data (science|analysis)|machine learning|linear algebra/i.test(t) ? 'supporting' : 'rare'
  if (NON_VISUAL_SUBJECTS.has(s)) return /\b(chart|graph|data)\b/i.test(t) && /econom|population|census|demograph/i.test(t) ? 'supporting' : 'rare'

  if (s === 'mathematics') return visual ? 'core' : 'supporting'
  if (s === 'science') return /kinematic|projectile|motion graph|position.?time|velocity.?time|vectors?\b/i.test(t) ? 'core' : 'supporting'
  if (s === 'business') return /econom|supply|demand|elasticity|cost curve|statistic|break.?even/i.test(t) ? 'supporting' : 'rare'

  // test-prep, other, general / unknown: decide from the text alone.
  if (visual) return 'core'
  if (MATH_WORDS.test(t) || SCIENCE_WORDS.test(t) || CHEM_MODEL_TOPICS.test(t)) return 'supporting'
  return 'rare'
}

/** Whether the prompt should offer chemistry models (Lewis, VSEPR, energy diagrams, molecules). */
export function wantsChemModels({ subject, text }: FigureContext): boolean {
  const s = (subject ?? '').toLowerCase()
  if (NON_VISUAL_SUBJECTS.has(s) || s === 'computer-science') return false
  return CHEM_MODEL_TOPICS.test(text ?? '')
}

/** Formats that can show figures at all (flashcards, plans and timelines can't). */
export const FIGURE_FORMATS = new Set(['outline', 'summary', 'cheatsheet', 'custom', 'quiz', 'practice'])
export const CHEM_MODEL_FORMATS = FIGURE_FORMATS

// Genetics: Punnett squares and pedigrees.
const BIO_MODEL_TOPICS = /genetic|mendel|punnett|pedigree|heredit|inherit|allele|genotype|phenotype|dominan|recessive|sex.linked|x.linked|dihybrid|monohybrid|codominan|incomplete dominance/i
// Mechanics: free-body diagrams and vectors.
const PHYSICS_MODEL_TOPICS = /physics|free.body|newton'?s (first|second|third|laws?)|\bforces?\b|friction|tension|incline|torque|vectors?\b|momentum|projectile|kinematic|circular motion|normal force|net force/i

export function wantsBioModels({ subject, text }: FigureContext): boolean {
  const s = (subject ?? '').toLowerCase()
  if (NON_VISUAL_SUBJECTS.has(s) || s === 'computer-science' || s === 'business') return false
  return BIO_MODEL_TOPICS.test(text ?? '')
}

export function wantsPhysicsModels({ subject, text }: FigureContext): boolean {
  const s = (subject ?? '').toLowerCase()
  if (NON_VISUAL_SUBJECTS.has(s) || s === 'computer-science' || s === 'business') return false
  return PHYSICS_MODEL_TOPICS.test(text ?? '')
}

/**
 * Whether the "Include visuals" switch matters for this request: the format can
 * show figures and the topic would get graphs or science models. When false the
 * switch is hidden (e.g. history: no figures are generated anyway).
 */
export function visualsRelevant(ctx: FigureContext & { format?: string | null }): boolean {
  if (ctx.format && !FIGURE_FORMATS.has(ctx.format)) return false
  if (!(ctx.text ?? '').trim() && !ctx.subject) return false
  return figurePolicy(ctx) !== 'rare' || wantsChemModels(ctx) || wantsBioModels(ctx) || wantsPhysicsModels(ctx)
}

/** Whether the guide viewer offers the Desmos calculator, and in which mode. */
export function calculatorFor(ctx: FigureContext): 'graphing' | 'scientific' | null {
  const s = (ctx.subject ?? '').toLowerCase()
  const t = ctx.text ?? ''
  const tier = figurePolicy(ctx)
  const mathish = s === 'mathematics' || s === 'science' || MATH_WORDS.test(t) || SCIENCE_WORDS.test(t) || AP_CORE.test(t) || AP_SUPPORT.test(t)
  if (tier === 'rare' || !mathish) return null
  if (SAT_ACT.test(t) && SAT_VERBAL.test(t) && !SAT_MATH.test(t)) return null
  return CHEM_WORDS.test(t) && !VISUAL_TOPICS.test(t) ? 'scientific' : 'graphing'
}

/** Figure budget for a format, written into the prompt. Empty = no figures. */
export function figureBudget(tier: FigureTier, format: string): string {
  const table: Record<string, Record<FigureTier, string>> = {
    quiz: {
      core: 'About 5-7 of the questions should include a figure, mixing kinds (reading a graph, a geometry figure, a data display), the way the real test does. The rest stay text only.',
      supporting: '2-4 questions may include a figure, only where the question is naturally visual (reading a graph or data display, a shape).',
      rare: 'Normally no figures. Add one only if the materials contain a chart or a question cannot be asked without it.',
    },
    practice: {
      core: 'About 1 in 3 activities should include a figure (usually multiple choice or fill-in questions about a graph, shape or data display).',
      supporting: '1-3 activities may include a figure, only where the question is naturally visual.',
      rare: 'Normally no figures.',
    },
    outline: {
      core: 'Give every concept that IS a shape, graph or data display its own figure (e.g. the graph of each function family, each triangle relationship, each kind of data display), plus a figure in worked examples that need one.',
      supporting: 'Include 1-3 figures where a picture explains the idea better than words.',
      rare: 'At most one figure, only if the materials contain a chart.',
    },
    cheatsheet: {
      core: 'Include small figures for the key shapes and graphs (parent functions, special triangles, data displays) inside the relevant boxes.',
      supporting: 'Include 1-2 small figures where they save words.',
      rare: '',
    },
  }
  table.summary = table.outline
  table.custom = table.outline
  const byTier = table[format]
  return byTier ? byTier[tier] : ''
}

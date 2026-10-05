// Prices and plan copy for /pricing (and anything else that quotes a price).
// Limits come from lib/plan-rules.ts so the page always matches enforcement.
// Agreed 2026-10-03: $9.99/month or $79.99/year, one 7-day trial with no card.

import { FREE_FORMATS, PLAN_LIMITS } from '@/lib/plan-rules'

export const PRICES = {
  monthly: 9.99,
  yearly: 79.99,
  trialDays: 7,
}

export const yearlyPerMonth = Math.floor((PRICES.yearly / 12) * 100) / 100
export const yearlySavingsPercent = Math.round((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100)

export const money = (n: number) => `$${n.toFixed(2)}`

const FORMAT_NAMES: Record<string, string> = { outline: 'outlines', quiz: 'quizzes', flashcards: 'flashcards', summary: 'summaries' }
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

const free = PLAN_LIMITS.free
const premium = PLAN_LIMITS.premium

export interface PlanFeature {
  text: string
  /** Shown greyed out with a dash on the free card. */
  missing?: boolean
}

export const FREE_FEATURES: PlanFeature[] = [
  { text: `${free.guide.limit} new study guides a week` },
  { text: capitalize(list(FREE_FORMATS.map((f) => FORMAT_NAMES[f] ?? f))) },
  { text: `${free.explain.limit} AI tutor explanations a day` },
  { text: 'Learn mode, Progress page and weak-spot tracking' },
  { text: 'Practice, study plans, cheat sheets and timelines', missing: true },
  { text: 'Hard questions and long guides', missing: true },
  { text: 'Guides shaped by what you get wrong', missing: true },
]

export const PREMIUM_FEATURES: PlanFeature[] = [
  { text: `Up to ${premium.guide.limit} study guides a month` },
  { text: 'Every format: practice, study plans, cheat sheets and timelines, plus the custom builder\'s AI assistant' },
  { text: 'Hard difficulty and long guides for test prep' },
  { text: `Up to ${premium.explain.limit} AI tutor explanations a day` },
  { text: 'New guides and the tutor lean on your weak spots' },
  { text: 'Exam grading for teachers' },
]

export const PRICING_FAQ: { q: string; a: string }[] = [
  { q: 'Is there a free trial?', a: `Yes. You can try Premium free for ${PRICES.trialDays} days, once, with no card. Save it for the week before a big test.` },
  { q: 'Can I cancel any time?', a: 'Yes. Cancel from your account and you keep Premium until the end of the period you paid for. Nothing renews after that.' },
  { q: 'What happens to my guides if I stop paying?', a: 'They stay yours. Every guide you made, and your progress, stays in My Guides on the free plan.' },
  { q: 'What counts as a guide?', a: 'Each new study guide you generate. Studying, retrying, Learn mode, flashcards you already have and the Progress page are always unlimited.' },
  { q: 'My teacher gave me a code. What do I do?', a: 'Open the menu under your initials and choose "Redeem a code". The code gives you Premium for as long as your teacher set it up.' },
  { q: 'Can my parent pay for it?', a: 'Yes. Send them a checkout link from this page. They pay, and Premium turns on in your account.' },
]

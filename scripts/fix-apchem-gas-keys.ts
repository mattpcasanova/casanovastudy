import { createClient } from '@supabase/supabase-js'
import { parseAdaptive } from '@/lib/adaptive/format'
import { questionKeyProblem } from '@/lib/formats/key-check'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ID = 'd5cee923-2202-4b7f-81fd-52b65c245cda'
const swaps: Array<[string, string]> = [
  [`A) 0.375 atm
B) 1.00 atm
C) 1.20 atm
D) 2.00 atm
ANSWER: B
IF A: [t2] You used the mass fraction of CH₄ (8/64) rather than the mole fraction.
IF C: You divided 0.500 mol by 1.25 mol incorrectly or mixed up the totals; recompute the total moles.
IF D: You found the partial pressure of N₂ (2.00 mol of 2.50 mol total is 0.800, not this); check which gas you solved for.`,
   `A) 0.375 atm
B) 0.600 atm
C) 1.20 atm
D) 2.40 atm
ANSWER: B
IF A: [t2] You used the mass fraction of CH₄ (8/64) rather than the mole fraction.
IF C: You divided 0.500 mol by the wrong total; 0.500 mol + 2.00 mol is 2.50 mol in all.
IF D: You found the partial pressure of N₂ (0.800 × 3.00 atm); the question asks for CH₄.`],
  [`A) 0.410 atm
B) 0.615 atm
C) 1.23 atm
D) 0.205 atm
ANSWER: A
IF B: [t2] You used the mole fraction of He, or mass instead of moles; recompute using 0.100 mol O₂.
IF C: You used the total moles, 0.300 mol, which gives the total pressure.
IF D: [t1] You used 27 instead of 300 K, which would give a far smaller pressure; recheck the calculation.
HINT: Each gas fills the whole vessel. What is n for O₂, and what T goes into PV = nRT?
EXPLANATION: n(O₂) = 3.20/32.0 = 0.100 mol, so P = nRT/V = (0.100)(0.08206)(300)/4.00 = 0.616 atm, closest to the option listed.`,
   `A) 0.410 atm
B) 0.615 atm
C) 1.23 atm
D) 0.205 atm
ANSWER: B
IF A: You took O₂'s share of He's pressure; each gas's pressure comes from its own moles, 0.100 mol here.
IF C: You used 0.200 mol, the amount of He, so this is the partial pressure of He.
IF D: You divided O₂'s pressure by 3; its 0.100 mol already gives its partial pressure directly.
HINT: Each gas fills the whole vessel. What is n for O₂, and what T goes into PV = nRT?
EXPLANATION: n(O₂) = 3.20/32.0 = 0.100 mol, so P = nRT/V = (0.100)(0.08206)(300)/4.00 = 0.615 atm.`],
]
async function main() {
  const apply = process.argv.includes('--apply')
  const { data: copies } = await sb.from('study_guides').select('id, title, language, reading_level').eq('translation_of', ID)
  console.log('translations / reading copies:', copies)
  const { data } = await sb.from('study_guides').select('content').eq('id', ID).single()
  let content = data!.content as string
  const before = parseAdaptive(content)
  for (const [a, b] of swaps) {
    if (content.split(a).length !== 2) throw new Error('block not found exactly once')
    content = content.replace(a, b)
  }
  const after = parseAdaptive(content)
  console.log('questions', before.questions.length, '->', after.questions.length, 'ids same:', before.questions.every((q, i) => q.id === after.questions[i].id && q.type === after.questions[i].type && q.options.length === after.questions[i].options.length))
  console.log('still flagged:', after.questions.filter((q) => questionKeyProblem(q)).map((q) => q.id))
  for (const id of ['a44', 'a46']) { const q = after.questions.find((x) => x.id === id)!; console.log(id, q.options, 'key', q.options[q.correct], q.feedback, q.traps) }
  if (!apply) return console.log('dry run')
  const { error } = await sb.from('study_guides').update({ content }).eq('id', ID)
  console.log(error ?? 'saved')
}
main()

// Finds multiple-choice questions whose key disagrees with their own explanation
// (lib/formats/key-check.ts) in saved adaptive banks and quizzes. Read only.
//   npx tsx --env-file=.env.local scripts/scan-keys.ts [--days 90] [--assigned] [--guide <id>]
import { createClient } from '@supabase/supabase-js'
import { parseAdaptive } from '@/lib/adaptive/format'
import { parseQuizRaw } from '@/lib/formats/quiz'
import { keyProblem } from '@/lib/formats/key-check'

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined }
const days = Number(arg('days') ?? 90)
const assignedOnly = process.argv.includes('--assigned')
const only = arg('guide')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: pa } = await sb.from('practice_assignments').select('study_guide_id')
  const assigned = new Set((pa ?? []).map((r) => r.study_guide_id as string))
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  let checked = 0, guides = 0, flagged = 0, flaggedGuides = 0
  const perKind: Record<string, { q: number; bad: number }> = {}
  for (let from = 0; ; from += 200) {
    let query = sb.from('study_guides').select('id, title, format, content, created_at').in('format', ['adaptive', 'quiz']).order('created_at', { ascending: false }).range(from, from + 199)
    query = only ? query.eq('id', only) : query.gte('created_at', since)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    if (!data?.length) break
    for (const g of data) {
      if (assignedOnly && !assigned.has(g.id)) continue
      guides++
      const items: Array<{ id: string; block: string; options: string[]; correct: number; explanation?: string; prompt: string }> = []
      if (g.format === 'adaptive') {
        const parsed = parseAdaptive(g.content ?? '')
        const blocks = new Map<string, string>()
        let block = 'bank'
        // Which block (bank / REFILL / MORE) each question came from, by document order.
        const marks = [...(g.content ?? '').matchAll(/^(REFILL|MORE):|^Q:/gm)]
        let qi = 0
        const graded = parsed.questions
        for (const m of marks) {
          if (m[1]) block = m[1]
          else if (graded[qi]) blocks.set(graded[qi++].id, block)
        }
        for (const q of parsed.questions) if (q.type === 'mc') items.push({ id: q.id, block: blocks.get(q.id) ?? 'bank', options: q.options, correct: q.correct, explanation: q.explanation, prompt: q.prompt })
      } else {
        for (const q of parseQuizRaw(g.content ?? '')) if (q.type === 'mc') items.push({ id: q.id, block: 'quiz', options: q.options, correct: q.options.indexOf(q.correctAnswer), explanation: q.explanation, prompt: q.question })
      }
      let bad = 0
      for (const q of items) {
        checked++
        const k = (perKind[q.block] ??= { q: 0, bad: 0 })
        k.q++
        const problem = keyProblem(q)
        if (!problem) continue
        k.bad++; bad++; flagged++
        console.log(`\n${problem.toUpperCase()}  ${g.format} ${g.id} ${assigned.has(g.id) ? '[ASSIGNED] ' : ''}"${g.title}"  ${q.id} (${q.block})`)
        console.log(`  Q: ${q.prompt.replace(/\s+/g, ' ').slice(0, 220)}`)
        console.log(`  Options: ${q.options.map((o, i) => (i === q.correct ? `[${o}]` : o)).join('  |  ')}`)
        console.log(`  Explanation: ${(q.explanation ?? '').replace(/\s+/g, ' ').slice(0, 260)}`)
      }
      if (bad) flaggedGuides++
    }
    if (only || data.length < 200) break
  }
  console.log(`\n${guides} guides, ${checked} multiple-choice questions checked, ${flagged} flagged in ${flaggedGuides} guides`)
  console.log(perKind)
}
main()

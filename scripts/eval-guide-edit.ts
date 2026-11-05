// Checks the guide editor's splitter on real guides (read only): cutting a guide
// into pieces and fields and putting it back must give a guide that parses the same.
//   npx tsx --env-file=.env.local scripts/eval-guide-edit.ts [perFormat=150]
import { createClient } from '@supabase/supabase-js'
import { parseQuizRaw } from '../lib/formats/quiz'
import { parsePracticeRaw } from '../lib/formats/practice'
import { parseTimeline } from '../lib/formats/timeline'
import { parseCheatSheet } from '../lib/formats/cheatsheet'
import { parseGuideStructure } from '../lib/formats/structure'
import { EDITABLE_FORMATS, editProblem, joinFields, joinPieces, pieceFields, splitPieces, type EditableFormat } from '../lib/guide-edit/pieces'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const per = Number(process.argv[2]) || 150

const parse: Record<EditableFormat, (c: string) => unknown> = {
  quiz: parseQuizRaw, practice: parsePracticeRaw, flashcards: (c) => c.split('\n').map((l) => l.trimEnd()).filter(Boolean), timeline: parseTimeline,
  cheatsheet: parseCheatSheet, outline: parseGuideStructure, summary: parseGuideStructure,
}

async function main() {
  for (const format of EDITABLE_FORMATS) {
    const { data } = await supabase.from('study_guides').select('id, content').eq('format', format).not('token_usage', 'is', null).order('created_at', { ascending: false }).limit(per)
    let same = 0, lines = 0, fieldsSame = 0, pieces = 0, problems = 0
    const bad: string[] = []
    for (const g of data ?? []) {
      const content = String(g.content ?? '')
      const cut = splitPieces(format, content)
      pieces += cut.length
      const back = joinPieces(cut)
      const ok = JSON.stringify(parse[format](back)) === JSON.stringify(parse[format](content))
      if (ok) same++; else bad.push(g.id)
      const kept = (c: string) => c.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd()).filter(Boolean).join('\n')
      if (kept(back) === kept(content)) lines++
      if (cut.every((p) => joinFields(pieceFields(format, p.text)) === p.text)) fieldsSame++
      if (editProblem(format, content, back, true)) problems++
    }
    const n = data?.length ?? 0
    console.log(`${format.padEnd(11)} ${n} guides, ${pieces} pieces | parses the same ${same}/${n} | every line kept ${lines}/${n} | fields exact ${fieldsSame}/${n} | would refuse an unchanged save ${problems}`)
    if (bad.length) console.log('   differs:', bad.slice(0, 5).join(', '))
  }
}
void main()

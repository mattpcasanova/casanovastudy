// One-time backfill: give guides saved without a subject ('general') a real one
// (ClaudeService.classifySubject, Haiku ~$0.0005 each), and copy it onto their
// answers in study_results that have no subject, so the Progress page groups
// them correctly. New guides get a subject at creation (generate-study-guide-stream).
//
//   npx tsx --env-file=.env.local scripts/backfill-subjects.ts          # dry run: prints what would change
//   npx tsx --env-file=.env.local scripts/backfill-subjects.ts --apply  # writes the changes

import { createClient } from '@supabase/supabase-js'
import { ClaudeService } from '../lib/claude-api'

const apply = process.argv.includes('--apply')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { data: guides, error } = await supabase
    .from('study_guides')
    .select('id, title, topic_focus, content, format')
    .or('subject.eq.general,subject.is.null')
    .neq('format', 'custom')
  if (error) throw error
  console.log(`${guides.length} guide(s) without a subject${apply ? '' : ' (dry run; add --apply to save)'}`)

  const claude = new ClaudeService()
  const counts: Record<string, number> = {}
  for (const g of guides) {
    let subject: string | null = null
    try {
      subject = await claude.classifySubject({ title: g.title ?? '', request: g.topic_focus ?? undefined, excerpt: g.content ?? undefined })
    } catch (e) {
      console.error(`  ${g.title}: classification failed`, e)
    }
    counts[subject ?? 'unsure'] = (counts[subject ?? 'unsure'] ?? 0) + 1
    console.log(`  ${(subject ?? 'unsure').padEnd(18)} ${g.title}`)
    if (!apply || !subject) continue
    await supabase.from('study_guides').update({ subject }).eq('id', g.id)
    await supabase.from('study_results').update({ subject }).eq('study_guide_id', g.id).is('subject', null)
  }
  console.log('\nSummary:', counts)
}

main().catch((e) => { console.error(e); process.exit(1) })

// Rewrites a real guide at an easier reading level and checks it still lines up
// item for item (nothing is saved). Prints the first items side by side.
//   npx tsx --env-file=.env.local scripts/eval-reading-level.ts [guideId] [grade2|grade4|grade6|grade8]
import { createClient } from '@supabase/supabase-js'
import { ClaudeService } from '@/lib/claude-api'
import { translationLinesUp } from '@/lib/guide-edit/translation'
import { normalizeLanguage, normalizeReadingLevel } from '@/lib/study-options'

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const [id, lvl] = process.argv.slice(2)
  const level = normalizeReadingLevel(lvl) ?? 'grade4'
  const q = admin.from('study_guides').select('id, title, format, content, language').not('content', 'is', null)
  const { data } = id ? await q.eq('id', id).maybeSingle() : await q.eq('format', 'quiz').not('token_usage', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) throw new Error('No guide found')
  console.log(`${data.title} (${data.format}, ${data.content.length} chars) -> ${level}`)
  const t0 = Date.now()
  const out = await new ClaudeService().simplifyGuide({ content: data.content, format: data.format, title: data.title, language: normalizeLanguage(data.language), level })
  const ok = translationLinesUp(data.format, data.content, out.text)
  console.log(`${Math.round((Date.now() - t0) / 1000)} s, $${out.usage.cost.toFixed(3)}, lines up: ${ok}, title: ${out.title}`)
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length
  const sentences = (s: string) => Math.max(1, (s.match(/[.!?](\s|$)/g) ?? []).length)
  console.log(`words ${words(data.content)} -> ${words(out.text)}; words per sentence ${(words(data.content) / sentences(data.content)).toFixed(1)} -> ${(words(out.text) / sentences(out.text)).toFixed(1)}`)
  console.log('\n--- original, first 1200 chars ---\n' + data.content.slice(0, 1200))
  console.log('\n--- rewritten, first 1200 chars ---\n' + out.text.slice(0, 1200))
}
main().catch((e) => { console.error(e); process.exit(1) })

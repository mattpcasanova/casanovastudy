// Builds a labeled stack for scripts/eval-page-split.ts from class sets that are
// already graded: each paper's saved pages in order, papers one after another,
// so the true first pages are known without anyone looking at photos (the
// teacher confirmed the split on the review screen). Read only.
//   npx tsx --env-file=.env.local scripts/make-split-eval.ts <out.json> [maxPages=120] [teacher email]
// Prints the --truth list to pass to eval-page-split.ts.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const [out, maxArg = '120', email] = process.argv.slice(2)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  if (!out) throw new Error('usage: make-split-eval.ts <out.json> [maxPages] [teacher email]')
  let userId: string | null = null
  if (email) {
    const { data } = await sb.from('user_profiles').select('id').eq('email', email).maybeSingle()
    userId = (data?.id as string) ?? null
    if (!userId) throw new Error(`No account for ${email}`)
  }
  let q = sb.from('grading_results').select('id, batch_id, page_urls, created_at, user_id').not('batch_id', 'is', null).not('page_urls', 'is', null).order('created_at', { ascending: false }).limit(600)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  const byBatch = new Map<string, Array<{ at: string; paths: string[] }>>()
  const seen = new Set<string>()
  for (const r of data ?? []) {
    const paths = ((r.page_urls ?? []) as Array<{ path?: string }>).map((p) => p.path).filter((p): p is string => !!p)
    // Group copies share one set of pages: count the paper once.
    if (!paths.length || seen.has(paths[0])) continue
    seen.add(paths[0])
    const list = byBatch.get(r.batch_id as string) ?? []
    list.push({ at: r.created_at as string, paths })
    byBatch.set(r.batch_id as string, list)
  }
  // Multi-page sets only: a stack of one-page papers says nothing about finding first pages.
  const sets = [...byBatch.entries()].filter(([, papers]) => papers.length >= 5 && papers.filter((p) => p.paths.length >= 3).length >= papers.length * 0.7)
  const pages: Array<{ path: string }> = []
  const truth: number[] = []
  const used: string[] = []
  for (const [batchId, papers] of sets) {
    if (pages.length >= Number(maxArg)) break
    used.push(`${batchId.slice(0, 8)} (${papers.length} papers)`)
    for (const p of papers.sort((a, b) => a.at.localeCompare(b.at))) {
      if (pages.length + p.paths.length > Number(maxArg)) break
      truth.push(pages.length)
      pages.push(...p.paths.map((path) => ({ path })))
    }
  }
  writeFileSync(out, JSON.stringify(pages))
  console.log(`${pages.length} pages, ${truth.length} papers from sets ${used.join(', ')}`)
  console.log(`--truth ${truth.join(',')}`)
}
main().catch((e) => { console.error(e); process.exit(1) })

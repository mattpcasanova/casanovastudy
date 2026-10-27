// One-time move of the files our rows still point at on Cloudinary into the
// private `uploads` bucket (migration 077), rewriting each reference from
// { url, name } to { path, name }:
//   grading_results.page_urls        (pages a paper was graded from; Regrade)
//   grading_batches.mark_scheme.images (a set's answer key; Add more papers)
//   assignments.mark_scheme_url      (hidden classes feature)
// Dry run by default; --apply writes. Files land at <owner>/migrated/<hash>.<ext>
// and a url -> path map is saved next to this script's output so a rerun
// never uploads the same file twice.
//   npx tsx --env-file=.env.local scripts/migrate-uploads-to-storage.ts [--apply] [--map map.json]

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { UPLOAD_BUCKET } from '../lib/uploads/refs'

const apply = process.argv.includes('--apply')
const mapArg = process.argv.indexOf('--map')
const mapFile = mapArg > 0 ? process.argv[mapArg + 1] : 'scripts/.uploads-migration-map.json'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const map: Record<string, string> = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : {}
const isCloudinary = (u: unknown): u is string => typeof u === 'string' && u.startsWith('https://res.cloudinary.com/')
let uploaded = 0, failed = 0

async function moveOne(url: string, owner: string, name: string): Promise<string | null> {
  if (map[url]) return map[url]
  const ext = (name.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? url.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? '.jpg').toLowerCase()
  if (!apply) return `${owner}/migrated/${createHash('sha1').update(url).digest('hex').slice(0, 20)}${ext}`
  const res = await fetch(url)
  if (!res.ok) { console.error('  could not fetch', url, res.status); failed++; return null }
  const buffer = Buffer.from(await res.arrayBuffer())
  const isPdf = buffer.subarray(0, 4).toString() === '%PDF'
  const contentType = buffer[0] === 0xff && buffer[1] === 0xd8 ? 'image/jpeg' : buffer[0] === 0x89 && buffer[1] === 0x50 ? 'image/png' : isPdf || ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'
  const path = `${owner}/migrated/${createHash('sha1').update(url).digest('hex').slice(0, 20)}${isPdf && ext !== '.pdf' ? '.pdf' : ext}`
  const { error } = await sb.storage.from(UPLOAD_BUCKET).upload(path, buffer, { contentType, upsert: true })
  if (error) { console.error('  upload failed', url, error.message); failed++; return null }
  map[url] = path
  uploaded++
  writeFileSync(mapFile, JSON.stringify(map, null, 2))
  return path
}

async function moveList(list: unknown, owner: string): Promise<{ refs: Array<{ path: string; name: string }>; changed: boolean } | null> {
  if (!Array.isArray(list) || !list.length) return null
  const refs: Array<{ path: string; name: string }> = []
  let changed = false
  for (const item of list as Array<{ url?: unknown; path?: unknown; name?: unknown }>) {
    const name = String(item?.name ?? '')
    if (typeof item?.path === 'string') { refs.push({ path: item.path, name }); continue }
    if (!isCloudinary(item?.url)) { console.error('  skipping unknown ref', item); return null }
    const path = await moveOne(item.url, owner, name)
    if (!path) return null
    refs.push({ path, name })
    changed = true
  }
  return { refs, changed }
}

async function main() {
  console.log(apply ? 'APPLYING' : 'DRY RUN (add --apply to write)')

  const { data: results } = await sb.from('grading_results').select('id, user_id, page_urls').not('page_urls', 'is', null)
  let rows = 0
  for (const r of results ?? []) {
    const moved = await moveList(r.page_urls, r.user_id)
    if (!moved?.changed) continue
    rows++
    if (apply) { const { error } = await sb.from('grading_results').update({ page_urls: moved.refs }).eq('id', r.id); if (error) console.error('  row update failed', r.id, error.message) }
  }
  console.log(`grading_results: ${rows} rows to rewrite`)

  const { data: batches } = await sb.from('grading_batches').select('batch_id, user_id, mark_scheme').not('mark_scheme', 'is', null)
  rows = 0
  for (const b of batches ?? []) {
    const scheme = b.mark_scheme as { texts?: unknown; images?: unknown }
    const moved = await moveList(scheme?.images, b.user_id)
    if (!moved?.changed) continue
    rows++
    if (apply) { const { error } = await sb.from('grading_batches').update({ mark_scheme: { ...scheme, images: moved.refs } }).eq('batch_id', b.batch_id); if (error) console.error('  batch update failed', b.batch_id, error.message) }
  }
  console.log(`grading_batches: ${rows} rows to rewrite`)

  const { data: assignments } = await sb.from('assignments').select('id, teacher_id, mark_scheme_url').not('mark_scheme_url', 'is', null)
  rows = 0
  for (const a of assignments ?? []) {
    if (!isCloudinary(a.mark_scheme_url)) continue
    const path = await moveOne(a.mark_scheme_url, a.teacher_id, a.mark_scheme_url.split('/').pop() ?? 'answer-key')
    if (!path) continue
    rows++
    if (apply) await sb.from('assignments').update({ mark_scheme_url: path }).eq('id', a.id)
  }
  console.log(`assignments: ${rows} rows to rewrite`)
  console.log(`files uploaded: ${uploaded}, failed: ${failed}, map entries: ${Object.keys(map).length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })

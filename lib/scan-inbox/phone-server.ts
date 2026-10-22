import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// One-time phone links: /phone/<token> (32 url-safe characters), stored as SHA-256.
export function newPhoneToken(): string {
  return randomBytes(24).toString('base64url')
}

export function hashPhoneToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Pages a phone uploaded but never finished sending (the phone lost signal,
// the teacher closed the tab) aren't in any scan_inbox_items row, so the
// 30-day inbox cleanup and account deletion wouldn't find them.

/** Deletes a phone link's files that no inbox item uses (all of them with `all`). */
export async function removePhoneFiles(supabase: SupabaseClient, session: { id: string; user_id: string }, all = false): Promise<number> {
  const folder = `${session.user_id}/phone/${session.id}`
  const { data: stored } = await supabase.storage.from('scan-inbox').list(folder, { limit: 1000 })
  let keep = new Set<string>()
  if (!all) {
    const { data: items } = await supabase.from('scan_inbox_items').select('files').eq('phone_session_id', session.id)
    keep = new Set((items ?? []).flatMap((r) => (r.files as Array<{ path: string }>).map((f) => f.path)))
  }
  const paths = (stored ?? []).map((o) => `${folder}/${o.name}`).filter((p) => !keep.has(p))
  for (let i = 0; i < paths.length; i += 100) await supabase.storage.from('scan-inbox').remove(paths.slice(i, i + 100))
  return paths.length
}

/** Expired a day ago or more: clear the unused files and forget the link (sent items stay in the inbox). */
export async function cleanupPhoneSessions(supabase: SupabaseClient): Promise<{ sessions: number; files: number }> {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: old } = await supabase.from('phone_upload_sessions').select('id, user_id').lt('expires_at', cutoff).limit(200)
  let files = 0
  for (const s of old ?? []) {
    files += await removePhoneFiles(supabase, s)
    await supabase.from('phone_upload_sessions').delete().eq('id', s.id)
  }
  return { sessions: old?.length ?? 0, files }
}

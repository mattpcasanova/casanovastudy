// Server side of the private `uploads` bucket: read a user's files with the
// service role (after checking the path is theirs), and remove everything a
// user uploaded when their account goes.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import { UPLOAD_BUCKET, isUploadPath, ownsUploadPath } from './refs'

export class UploadAccessError extends Error {}

/**
 * Downloads one upload. With `ownerId`, the path must be in that user's folder
 * (every route that takes uploads from a request passes the caller's id).
 */
export async function downloadUpload(path: string, ownerId?: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  if (!isUploadPath(path) || (ownerId && !ownsUploadPath(path, ownerId))) throw new UploadAccessError('Files must be uploaded through the app')
  const { data, error } = await createAdminClient().storage.from(UPLOAD_BUCKET).download(path)
  if (error || !data) throw new Error(`Could not load ${path.split('/').pop()}: ${error?.message ?? 'not found'}`)
  return { buffer: Buffer.from(await data.arrayBuffer()), contentType: data.type || null }
}

/** Deletes every file under `<userId>/` in the uploads bucket (account deletion). Returns how many. */
export async function removeUserUploads(supabase: SupabaseClient, userId: string): Promise<number> {
  const bucket = supabase.storage.from(UPLOAD_BUCKET)
  const { data: kinds } = await bucket.list(userId, { limit: 1000 })
  let removed = 0
  for (const kind of kinds ?? []) {
    if (kind.id) continue // a file at the top level, which the uploader never makes
    const folder = `${userId}/${kind.name}`
    for (let offset = 0; ; offset += 1000) {
      const { data: files } = await bucket.list(folder, { limit: 1000, offset })
      const paths = (files ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`)
      for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100))
      removed += paths.length
      if ((files?.length ?? 0) < 1000) break
    }
  }
  return removed
}

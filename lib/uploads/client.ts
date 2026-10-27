// Browser → Supabase Storage upload, straight into the signed-in user's own
// folder of the private `uploads` bucket (RLS: migration 077), so files never
// pass through a Vercel function and its 4.5 MB body limit. Files are prepared
// and shrunk first (lib/uploads/prepare.ts); nothing here changes them.

import { supabase } from '@/lib/supabase'
import { UPLOAD_BUCKET, uploadPath, type UploadRef } from './refs'

export interface UploadedFile extends UploadRef {
  size: number
}

let cachedUserId: string | null = null

async function currentUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId
  const { data: { session } } = await supabase.auth.getSession()
  const id = session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id
  if (!id) throw new Error('Sign in to upload files.')
  cachedUserId = id
  return id
}

const TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf', txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

function contentTypeFor(blob: Blob, name: string): string {
  if (blob.type && blob.type !== 'application/octet-stream') return blob.type
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return TYPE_BY_EXT[ext] ?? 'application/octet-stream'
}

/** Uploads one file; `kind` groups it (guide-images, grading-pages, ...). Retries once on a network blip. */
export async function uploadFile(blob: Blob, kind: string, name = (blob as File).name || 'upload'): Promise<UploadedFile> {
  const userId = await currentUserId()
  const path = uploadPath(userId, kind, name)
  const contentType = contentTypeFor(blob, name)
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, blob, { contentType, upsert: false })
    if (!error) return { path, name, size: blob.size }
    lastError = error
    console.error('Upload failed:', name, error.message)
    if (/exists|duplicate/i.test(error.message)) break
  }
  throw new Error(`Upload failed for ${name}. ${lastError instanceof Error ? lastError.message : 'Please try again.'}`)
}

/** Uploads several files a few at a time, keeping their order. */
export async function uploadFiles(
  items: Array<{ blob: Blob; name: string }>,
  kind: string,
  options: { concurrency?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<UploadedFile[]> {
  const out: UploadedFile[] = new Array(items.length)
  let next = 0, finished = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await uploadFile(items[i].blob, kind, items[i].name)
      options.onProgress?.(++finished, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 6, items.length) }, worker))
  return out
}

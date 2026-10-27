// A reference to a file in the private `uploads` bucket: its path and the
// name the user knows it by. Paths are <user id>/<kind>/<file>, so the first
// segment says who uploaded it and routes can refuse anyone else's files.
// Pure; shared by the browser uploader and every route that takes uploads.

export interface UploadRef {
  path: string
  name: string
}

export const UPLOAD_BUCKET = 'uploads'

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PATH_RE = new RegExp(`^${UUID}/[a-z0-9-]{1,40}/[^/\\\\]{1,160}$`, 'i')

export function isUploadPath(path: unknown): path is string {
  return typeof path === 'string' && PATH_RE.test(path) && !path.includes('..')
}

export function uploadOwner(path: string): string {
  return path.split('/')[0]
}

export function ownsUploadPath(path: string, userId: string): boolean {
  return isUploadPath(path) && uploadOwner(path).toLowerCase() === userId.toLowerCase()
}

/** A file name safe for a storage path: letters, digits, dashes, underscores, its extension, and a random suffix so repeats never collide. */
export function uploadFileName(name: string, random: string = Math.random().toString(36).slice(2, 10)): string {
  const base = name.replace(/\.[^/.]+$/, '').normalize('NFKD').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'file'
  const ext = name.match(/\.[a-z0-9]{1,5}$/i)?.[0].toLowerCase() ?? ''
  return `${base}-${random}${ext}`
}

/** Builds the storage path for a new upload. `kind` groups files (guide-images, grading-pages, ...). */
export function uploadPath(userId: string, kind: string, name: string): string {
  const safeKind = kind.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40) || 'files'
  return `${userId}/${safeKind}/${uploadFileName(name)}`
}

/** Sanitizes a request body's list of uploads: keeps well-formed `{ path, name }` items only, at most `max`. */
export function pickUploadRefs(list: unknown, max: number): UploadRef[] {
  if (!Array.isArray(list)) return []
  const out: UploadRef[] = []
  for (const item of list) {
    if (out.length >= max) break
    const path = (item as { path?: unknown })?.path
    if (!isUploadPath(path)) continue
    const name = String((item as { name?: unknown })?.name ?? '').slice(0, 200)
    out.push({ path, name: name || path.split('/').pop()! })
  }
  return out
}

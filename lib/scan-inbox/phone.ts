// Send from your phone (migration 067). Pure, browser-safe; unit-tested.
// Tokens (made and hashed with node crypto) are in phone-server.ts.
//  - storage paths: <teacher>/phone/<session>/<send>-<nnn>.<ext>
//  - page names on the laptop: "Phone 1-001.jpg" (natural order = the order on the phone)
//  - photo picks are put in camera-roll order when their names allow it

export const PHONE_LIMITS = {
  /** How long a QR code works. */
  sessionMinutes: 120,
  /** Pages (or files) one link can send in total. */
  maxFiles: 400,
  /** Pages per send. */
  maxFilesPerSend: 150,
  /** Prepared pages are ~200-500 KB; a PDF that couldn't be split on the phone goes up whole. */
  maxFileBytes: 60 * 1024 * 1024,
}

export function looksLikePhoneToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token)
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif', 'image/webp': 'webp', 'application/pdf': 'pdf' }

export function phoneFileExt(contentType: string): string | null {
  return EXT[contentType.toLowerCase()] ?? null
}

export function phoneUploadPath(userId: string, sessionId: string, send: number, index: number, contentType: string): string | null {
  const ext = phoneFileExt(contentType)
  if (!ext) return null
  return `${userId}/phone/${sessionId}/${send}-${String(index + 1).padStart(3, '0')}.${ext}`
}

/** The name the laptop sees: sorts in phone order, and isn't mistaken for a student's name. */
export function phonePageName(send: number, index: number, contentType: string): string {
  return `Phone ${send}-${String(index + 1).padStart(3, '0')}.${phoneFileExt(contentType) ?? 'jpg'}`
}

/** Only paths this session handed out for this send. */
export function isSessionPath(path: string, userId: string, sessionId: string, send: number): boolean {
  const prefix = `${userId}/phone/${sessionId}/${send}-`
  return path.startsWith(prefix) && /^\d{3}\.(jpg|png|heic|heif|webp|pdf)$/.test(path.slice(prefix.length))
}

const CAMERA_NAME = /^(IMG|PXL|DSC|DSCN|DCIM|PHOTO)[_-]?\d/i

/**
 * Photos picked in one go keep the order they were tapped, unless every one has
 * a camera name (IMG_1234, PXL_2026…): then camera-roll order, which is the
 * order they were taken.
 */
export function orderPicked<T extends { name: string }>(files: T[]): T[] {
  const names = new Set(files.map((f) => f.name))
  if (files.length < 2 || names.size !== files.length || !files.every((f) => CAMERA_NAME.test(f.name))) return files
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
}

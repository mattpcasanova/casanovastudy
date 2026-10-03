// What kind of file a student or teacher dropped in, and how we'll read it.
// Shared by the guide maker, the custom builder and grading (lib/uploads/prepare.ts
// does the actual converting in the browser). Pure and unit-tested.

export type UploadKind =
  | 'pdf'      // text layer read as text; scanned pages become images
  | 'image'    // JPG/PNG/WEBP/GIF/AVIF/BMP: resized to a JPEG
  | 'heic'     // iPhone photos: decoded to JPEG in the browser
  | 'docx'     // read as text
  | 'pptx'     // read as text
  | 'text'     // .txt / .md / .csv read as text
  | 'legacy'   // .ppt/.doc/.key/.pages: browsers can't read them, ask for a PDF
  | 'unsupported'

/** File picker filter used everywhere. `image/*` lets phones offer the camera roll. */
export const UPLOAD_ACCEPT = [
  '.pdf', '.docx', '.pptx', '.txt', '.md', '.csv',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.avif', '.bmp',
  '.ppt', '.doc', '.key', '.pages',
  'image/*', 'application/pdf',
].join(',')

/** Friendly list for drop-zone hints. */
export const UPLOAD_HINT = 'Photos (any phone format), PDF, Word, PowerPoint or text'

export const UPLOAD_LIMITS = {
  /** Per original file. Everything is shrunk in the browser, so this only stops absurd files. */
  maxFileBytes: 200 * 1024 * 1024,
  /** Longest image edge sent to Claude (its recommended size; handwriting stays legible). */
  imageEdge: 1568,
  /** Photos/scanned pages per guide: Claude reads up to 100 per request, and each costs ~2.5k tokens. */
  maxGuideImages: 40,
}

const EXT_KIND: Record<string, UploadKind> = {
  pdf: 'pdf',
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image', avif: 'image', bmp: 'image',
  heic: 'heic', heif: 'heic',
  docx: 'docx', pptx: 'pptx',
  txt: 'text', md: 'text', csv: 'text',
  ppt: 'legacy', doc: 'legacy', key: 'legacy', pages: 'legacy',
}

export function extensionOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : ''
}

/** Kind from the name and MIME type (phones sometimes send an empty or generic type). */
export function uploadKind(name: string, mime = ''): UploadKind {
  const byExt = EXT_KIND[extensionOf(name)]
  if (byExt) return byExt
  const t = mime.toLowerCase()
  if (t === 'image/heic' || t === 'image/heif' || t === 'image/heic-sequence' || t === 'image/heif-sequence') return 'heic'
  if (t.startsWith('image/')) return 'image'
  if (t === 'application/pdf') return 'pdf'
  if (t === 'text/plain' || t === 'text/markdown' || t === 'text/csv') return 'text'
  if (t.includes('wordprocessingml')) return 'docx'
  if (t.includes('presentationml')) return 'pptx'
  return 'unsupported'
}

/** True when the first bytes say HEIC/HEIF (an ISO-BMFF "ftyp" box with a HEIF brand). */
export function looksLikeHeic(head: Uint8Array): boolean {
  if (head.length < 12) return false
  const ftyp = String.fromCharCode(...head.slice(4, 8))
  const brand = String.fromCharCode(...head.slice(8, 12))
  return ftyp === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)
}

/** How to get an unreadable format into something we can read. */
export function legacyHelp(name: string): string {
  const ext = extensionOf(name)
  if (ext === 'key') return `${name}: Keynote files can't be read in a browser. In Keynote choose File > Export To > PDF, then upload the PDF.`
  if (ext === 'pages') return `${name}: Pages files can't be read in a browser. In Pages choose File > Export To > PDF, then upload the PDF.`
  if (ext === 'ppt') return `${name}: this is the old PowerPoint format. Open it and choose File > Save As > PowerPoint (.pptx) or PDF, then upload that.`
  if (ext === 'doc') return `${name}: this is the old Word format. Open it and choose File > Save As > Word (.docx) or PDF, then upload that.`
  return `${name}: this file type isn't supported. Try a PDF, a photo, or a Word or PowerPoint file.`
}

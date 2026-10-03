"use client"

// Turns whatever someone uploads into what Claude reads best, in the browser,
// before anything is sent: photos (HEIC included) become JPEGs at Claude's
// recommended size, PDF pages are read as text or rendered as images (scanned
// pages), and Word/PowerPoint/text files become text. Small outputs mean no
// "file too big" dead ends and no 4.5 MB request limits.
// Kinds and limits: lib/uploads/kinds.ts.

import { extractTextFromDOCX, extractTextFromPPTX } from '@/lib/client-file-processor'
import { loadPdfJs } from '@/lib/pdf-to-images'
import { UPLOAD_LIMITS, legacyHelp, looksLikeHeic, uploadKind } from './kinds'

export interface PreparedImage {
  name: string
  blob: Blob // always image/jpeg
}

export interface PreparedMaterials {
  texts: Array<{ name: string; content: string }>
  images: PreparedImage[]
  /** Files we couldn't use, with what to do about them. */
  problems: string[]
}

export interface PrepareOptions {
  /** 'auto': PDF pages with real text are read as text, others become images. 'images': every page is an image (grading, where handwriting matters). */
  pdfMode?: 'auto' | 'images'
  maxImages?: number
  onProgress?: (message: string) => void
}

const PAGE_TEXT_MIN_CHARS = 80

export async function prepareMaterials(files: File[], opts: PrepareOptions = {}): Promise<PreparedMaterials> {
  const out: PreparedMaterials = { texts: [], images: [], problems: [] }
  const maxImages = opts.maxImages ?? UPLOAD_LIMITS.maxGuideImages
  const progress = opts.onProgress ?? (() => {})
  let droppedImages = 0

  const addImage = (img: PreparedImage) => {
    if (out.images.length >= maxImages) { droppedImages++; return }
    out.images.push(img)
  }

  for (const file of files) {
    if (file.size > UPLOAD_LIMITS.maxFileBytes) {
      out.problems.push(`${file.name} is over ${Math.round(UPLOAD_LIMITS.maxFileBytes / 1024 / 1024)} MB. Try splitting it into smaller PDFs.`)
      continue
    }
    let kind = uploadKind(file.name, file.type)
    // Some phones and Windows browsers hand over HEIC with a .jpg name or no type at all.
    if (kind === 'image' || kind === 'unsupported') {
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
      if (looksLikeHeic(head)) kind = 'heic'
    }
    try {
      switch (kind) {
        case 'image':
        case 'heic':
          progress(`Preparing ${file.name}...`)
          addImage({ name: jpegName(file.name), blob: await imageToJpeg(file, kind === 'heic') })
          break
        case 'pdf': {
          const { texts, images } = await readPdf(file, opts.pdfMode ?? 'auto', progress, maxImages - out.images.length)
          if (texts.length) out.texts.push({ name: file.name, content: texts.join('\n\n') })
          images.forEach(addImage)
          break
        }
        case 'docx':
          progress(`Reading ${file.name}...`)
          out.texts.push({ name: file.name, content: await extractTextFromDOCX(file) })
          break
        case 'pptx':
          progress(`Reading ${file.name}...`)
          out.texts.push({ name: file.name, content: await extractTextFromPPTX(file) })
          break
        case 'text':
          out.texts.push({ name: file.name, content: await file.text() })
          break
        default:
          out.problems.push(legacyHelp(file.name))
      }
    } catch (e) {
      console.error(`Could not prepare ${file.name}:`, e)
      out.problems.push(`${file.name} couldn't be read${e instanceof Error && e.message ? ` (${e.message})` : ''}. Try exporting it as a PDF or taking a photo of it.`)
    }
  }

  if (droppedImages) {
    out.problems.push(`Only the first ${maxImages} photos or pages were used (${droppedImages} left out). For more, split them across two guides.`)
  }
  return out
}

function jpegName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '') + '.jpg'
}

/** Any browser-readable image (or HEIC) → JPEG with the long edge at most `maxEdge`. */
export async function imageToJpeg(file: Blob, heic = false, maxEdge = UPLOAD_LIMITS.imageEdge): Promise<Blob> {
  let bitmap: ImageBitmap | null = null
  try {
    // Native decode: every image type, and HEIC in Safari. Honors EXIF rotation.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    if (!heic) throw new Error('this image could not be opened')
  }
  if (!bitmap) {
    // Chrome, Firefox and Edge can't decode HEIC: load libheif only when needed.
    const { heicTo } = await import('heic-to')
    bitmap = await heicTo({ blob: file, type: 'bitmap' })
  }
  try {
    return await bitmapToJpeg(bitmap, maxEdge)
  } finally {
    bitmap.close()
  }
}

async function bitmapToJpeg(source: ImageBitmap | HTMLCanvasElement, maxEdge: number): Promise<Blob> {
  const w = source.width, h = source.height
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  // ~0.85 keeps handwriting crisp at ~200-500 KB per page.
  for (const quality of [0.85, 0.75, 0.65]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality))
    if (blob && (blob.size <= 1.5 * 1024 * 1024 || quality === 0.65)) return blob
  }
  throw new Error('could not encode image')
}

/** Reads each PDF page as text, or renders it to a JPEG when it has no real text (scans, photos). */
async function readPdf(file: File, mode: 'auto' | 'images', progress: (m: string) => void, imageRoom: number) {
  const pdfjs = await loadPdfJs()
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const texts: string[] = []
  const images: PreparedImage[] = []
  const base = file.name.replace(/\.pdf$/i, '')
  for (let n = 1; n <= pdf.numPages; n++) {
    progress(pdf.numPages > 1 ? `Reading ${file.name}, page ${n} of ${pdf.numPages}...` : `Reading ${file.name}...`)
    const page = await pdf.getPage(n)
    if (mode === 'auto') {
      const tc = await page.getTextContent()
      const text = tc.items.map((i: { str?: string }) => i.str ?? '').join(' ').replace(/\s+/g, ' ').trim()
      if (text.length >= PAGE_TEXT_MIN_CHARS) {
        texts.push(`[Page ${n}]\n${text}`)
        continue
      }
    }
    if (images.length >= imageRoom) continue
    const viewport1 = page.getViewport({ scale: 1 })
    const scale = Math.min(3, UPLOAD_LIMITS.imageEdge / Math.max(viewport1.width, viewport1.height))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    // intent 'print': the display intent stalls in background tabs.
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport, intent: 'print' }).promise
    images.push({ name: `${base} p${n}.jpg`, blob: await bitmapToJpeg(canvas, UPLOAD_LIMITS.imageEdge) })
  }
  return { texts, images }
}

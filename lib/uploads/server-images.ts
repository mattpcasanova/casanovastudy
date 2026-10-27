// Server side of photo/scanned-page uploads: read the JPEGs the browser
// prepared and put in the private `uploads` bucket (lib/uploads/client.ts), and
// turn them into base64 image blocks for Claude. Only files in the caller's
// own folder are read, and the real type comes from the file's first bytes.

import type { GuideImage } from '@/types'
import { UPLOAD_LIMITS } from './kinds'
import { pickUploadRefs } from './refs'
import { downloadUpload } from './storage-server'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // Claude's per-image limit

export function sniffImageType(head: Uint8Array): GuideImage['mediaType'] | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg'
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png'
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return 'image/gif'
  if (String.fromCharCode(...head.slice(0, 4)) === 'RIFF' && String.fromCharCode(...head.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

export interface FetchedImage {
  name: string
  mediaType: GuideImage['mediaType']
  buffer: Buffer
}

/** Validates and downloads `[{ path, name }]` from a request body, all of them `ownerId`'s own uploads. Throws a readable error. */
export async function fetchUploadedImageBuffers(list: unknown, max: number, ownerId: string): Promise<FetchedImage[]> {
  if (list == null) return []
  if (!Array.isArray(list)) throw new Error('Invalid images')
  if (list.length > max) throw new Error(`Too many photos or pages (${list.length}). The limit is ${max}.`)
  const items = pickUploadRefs(list, max)
  if (items.length !== list.length) throw new Error('Images must be uploaded through the app')

  const out: FetchedImage[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      const { buffer } = await downloadUpload(items[i].path, ownerId)
      if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error(`${items[i].name} is too large`)
      const mediaType = sniffImageType(new Uint8Array(buffer.subarray(0, 12)))
      if (!mediaType) throw new Error(`${items[i].name} isn't an image we can read`)
      out[i] = { name: items[i].name, mediaType, buffer }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, items.length) }, worker))
  return out
}

/** Same, as base64 image blocks for guide generation. */
export async function fetchUploadedImages(list: unknown, ownerId: string, max = UPLOAD_LIMITS.maxGuideImages): Promise<GuideImage[]> {
  const images = await fetchUploadedImageBuffers(list, max, ownerId)
  return images.map((img) => ({ name: img.name, mediaType: img.mediaType, data: img.buffer.toString('base64') }))
}

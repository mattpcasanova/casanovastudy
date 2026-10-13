"use client"

// Reads the name-stamp QR code ("CS1:<code>:<page>") from prepared page
// images in the browser (jsQR, no AI). The decoding itself is decodeStamp
// (decode.ts, DOM-free and tested on rendered, noisy pages).

import type { StampRead } from './codes'
import { decodeStamp } from './decode'

export async function readStamp(image: Blob): Promise<StampRead | null> {
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(image) } catch { return null }
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return decodeStamp((x, y, w, h) => ctx.getImageData(x, y, w, h).data, canvas.width, canvas.height)
}

/**
 * Reads every page, a few at a time. A stack whose first pages have no stamp
 * isn't a stamped test: the rest is skipped so ordinary stacks stay fast.
 */
export async function readStamps(images: Blob[], onProgress?: (done: number) => void): Promise<Array<StampRead | null>> {
  const out: Array<StampRead | null> = new Array(images.length).fill(null)
  const PROBE = 6
  const probe = await Promise.all(images.slice(0, PROBE).map(readStamp))
  probe.forEach((s, i) => { out[i] = s })
  onProgress?.(probe.length)
  if (!probe.some(Boolean)) return out

  let next = probe.length
  let done = probe.length
  const worker = async () => {
    while (next < images.length) {
      const i = next++
      out[i] = await readStamp(images[i])
      onProgress?.(++done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, images.length) }, worker))
  return out
}

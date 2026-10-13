// Decodes a name-stamp QR from page pixels. DOM-free so it can be tested on
// rendered pages in Node (decode.test.ts). Looks in each corner (where the
// stamp is printed), then the whole page.

import jsQR from 'jsqr'
import { parseQrPayload, type StampRead } from './codes'

type ReadRegion = (x: number, y: number, w: number, h: number) => Uint8ClampedArray

/** Scanner noise and JPEG speckle confuse jsQR's own thresholding; a clean black-and-white copy reads reliably. */
export function blackAndWhite(data: Uint8ClampedArray, cut: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  for (let i = 0; i < data.length; i += 4) {
    const v = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2] < cut ? 0 : 255
    out[i] = out[i + 1] = out[i + 2] = v
    out[i + 3] = 255
  }
  return out
}

export function decodeStamp(read: ReadRegion, width: number, height: number): StampRead | null {
  const w = Math.ceil(width * 0.45)
  const h = Math.ceil(height * 0.3)
  const corners: Array<[number, number, number, number]> = [
    [width - w, 0, w, h], // top right
    [width - w, height - h, w, h], // bottom right
    [0, 0, w, h], // top left
    [0, height - h, w, h], // bottom left
  ]
  for (const [x, y, rw, rh] of corners) {
    const data = read(x, y, rw, rh)
    // A lighter cutoff catches faint prints; the raw pixels are the last try.
    for (const cut of [128, 170, 0]) {
      const stamp = parseQrPayload(jsQR(cut ? blackAndWhite(data, cut) : data, rw, rh, { inversionAttempts: 'dontInvert' })?.data)
      if (stamp) return stamp
    }
  }
  const all = read(0, 0, width, height)
  return parseQrPayload(jsQR(blackAndWhite(all, 128), width, height, { inversionAttempts: 'dontInvert' })?.data)
}

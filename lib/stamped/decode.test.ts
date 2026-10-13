import { PDFDocument } from 'pdf-lib'
import { createCanvas } from '@napi-rs/canvas'
import { describe, expect, it } from 'vitest'
import { stampTest, type StampCorner } from './stamp-pdf'
import { decodeStamp } from './decode'

// The real path: stamp a test, render each page the way the grader prepares
// it (1568 px long edge), make it look scanned (gray paper, noise), decode.
async function renderPages(pdf: Uint8Array) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: pdf }).promise
  const pages = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const base = page.getViewport({ scale: 1 })
    const vp = page.getViewport({ scale: 1568 / Math.max(base.width, base.height) })
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height))
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx as never, viewport: vp, canvas: canvas as never }).promise
    pages.push({ ctx, width: canvas.width, height: canvas.height })
  }
  return pages
}

function scanned(data: Uint8ClampedArray, seed: number) {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const out = new Uint8ClampedArray(data)
  for (let i = 0; i < out.length; i += 4) {
    const n = (rnd() - 0.5) * 120 // heavy noise: ±60
    for (let c = 0; c < 3; c++) out[i + c] = Math.max(0, Math.min(255, out[i + c] * 0.8 + 30 + n))
  }
  return out
}

describe('stamped pages round trip', () => {
  it.each(['top-right', 'bottom-left'] as StampCorner[])('reads every page stamped in the %s corner', async (corner) => {
    const blank = await PDFDocument.create()
    for (let i = 0; i < 3; i++) blank.addPage([612, 792]).drawText(`Question ${i + 1}: show your working.`, { x: 72, y: 690, size: 14 })
    const pdf = await stampTest((await blank.save()).slice().buffer, [{ code: 'ABCD2345', name: 'Sean Miller' }, { code: 'QRST6789', name: 'Ava Kim' }], { title: 'Unit 3', className: 'AP Chem P2', corner })
    const pages = await renderPages(pdf)
    const reads = pages.map(({ ctx, width, height }, i) => decodeStamp((x, y, w, h) => scanned(ctx.getImageData(x, y, w, h).data as Uint8ClampedArray, i + 1), width, height))
    expect(reads.map((r) => r && `${r.code}:${r.page}`)).toEqual(['ABCD2345:1', 'ABCD2345:2', 'ABCD2345:3', 'QRST6789:1', 'QRST6789:2', 'QRST6789:3'])
  }, 60000)

  it('finds nothing on an unstamped page', async () => {
    const blank = await PDFDocument.create()
    blank.addPage([612, 792]).drawText('Name: ________   Question 1', { x: 72, y: 690, size: 14 })
    const [page] = await renderPages(await blank.save())
    expect(decodeStamp((x, y, w, h) => page.ctx.getImageData(x, y, w, h).data as Uint8ClampedArray, page.width, page.height)).toBeNull()
  }, 60000)
})

"use client"

// Stamps a blank test PDF for printing: one copy per student, every page with
// the student's name, "Page p of n" and a QR code ("CS1:<code>:<page>",
// lib/stamped/codes.ts) in a corner. Runs in the browser with pdf-lib.

import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'
import { qrPayload } from './codes'

export type StampCorner = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'

/** Standard PDF fonts only cover Latin-1: strip accents, then replace anything left. */
function safeText(font: PDFFont, text: string): string {
  try {
    font.encodeText(text)
    return text
  } catch {
    const plain = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '?')
    return plain
  }
}

function fitText(font: PDFFont, text: string, size: number, maxWidth: number): string {
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(t, size) > maxWidth) t = t.slice(0, -2) + '…'
  return t
}

export async function stampTest(
  blank: ArrayBuffer,
  copies: Array<{ code: string; name: string }>,
  opts: { title: string; className?: string; corner?: StampCorner; onProgress?: (done: number, total: number) => void },
): Promise<Uint8Array> {
  const src = await PDFDocument.load(blank)
  const out = await PDFDocument.create()
  const bold = await out.embedFont(StandardFonts.HelveticaBold)
  const regular = await out.embedFont(StandardFonts.Helvetica)
  const total = src.getPageCount()
  const indices = src.getPageIndices()
  const corner = opts.corner ?? 'top-right'

  const QR = 54 // points (0.75 in): reads reliably at 150-300 dpi scans
  const BOX_W = 196
  const BOX_H = QR + 8
  const MARGIN = 14

  for (const [n, copy] of copies.entries()) {
    const pages = await out.copyPages(src, indices)
    for (const [i, page] of pages.entries()) {
      out.addPage(page)
      const { width, height } = page.getSize()
      const x = corner.endsWith('right') ? width - MARGIN - BOX_W : MARGIN
      const y = corner.startsWith('top') ? height - MARGIN - BOX_H : MARGIN
      const png = await out.embedPng(await QRCode.toDataURL(qrPayload(copy.code, i + 1), { errorCorrectionLevel: 'M', margin: 1, scale: 8 }))

      page.drawRectangle({ x, y, width: BOX_W, height: BOX_H, color: rgb(1, 1, 1), borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5 })
      page.drawImage(png, { x: x + 4, y: y + 4, width: QR, height: QR })
      const tx = x + QR + 10
      const maxW = BOX_W - QR - 14
      page.drawText(fitText(bold, safeText(bold, copy.name), 10, maxW), { x: tx, y: y + BOX_H - 16, size: 10, font: bold, color: rgb(0.1, 0.1, 0.1) })
      const sub = [opts.className, opts.title].filter(Boolean).join(' · ')
      if (sub) page.drawText(fitText(regular, safeText(regular, sub), 7, maxW), { x: tx, y: y + BOX_H - 28, size: 7, font: regular, color: rgb(0.35, 0.35, 0.35) })
      page.drawText(`Page ${i + 1} of ${total}`, { x: tx, y: y + 8, size: 8, font: regular, color: rgb(0.25, 0.25, 0.25) })
    }
    opts.onProgress?.(n + 1, copies.length)
  }
  return out.save()
}

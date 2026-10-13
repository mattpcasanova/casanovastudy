import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { stampTest } from './stamp-pdf'

describe('stampTest', () => {
  it('makes one stamped copy per student, accents and long names included', async () => {
    const blank = await PDFDocument.create()
    blank.addPage([612, 792]).drawText('Q1. What is 2 + 2?', { x: 72, y: 700, size: 14 })
    blank.addPage([612, 792]).drawText('Q2. Explain photosynthesis.', { x: 72, y: 700, size: 14 })
    const bytes = await blank.save()
    const progress: number[] = []
    const out = await stampTest(bytes.slice().buffer, [
      { code: 'ABCD2345', name: 'Sean Miller' },
      { code: 'EFGH6789', name: 'José Núñez' },
      { code: 'JKMN2345', name: 'Mary Ann Lee-Washington-Featherstonehaugh Ł' },
    ], { title: 'Unit 3 test', className: 'AP Chemistry P2', onProgress: (d) => progress.push(d) })
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(6)
    expect(progress).toEqual([1, 2, 3])
  })
})

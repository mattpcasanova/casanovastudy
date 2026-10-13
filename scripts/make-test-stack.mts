// Makes a realistic fake class set for testing batch grading: a typed mark
// scheme and ONE scanned-looking stack PDF (8 students x 3 pages, handwriting
// font, slight tilt, scanner speckle) in copier order, with the problems real
// stacks have: a name on every page (misspelled later), no name at all, a
// faint messy name, "Last, First". Also the same students as one file each
// ("Mya Johnson.pdf") for the one-student-per-file convention.
//   npx tsx scripts/make-test-stack.mts <outDir>

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument, StandardFonts } from 'pdf-lib'

const out = process.argv[2] ?? 'test-stack'
mkdirSync(join(out, 'one-file-each'), { recursive: true })
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf', 'Hand')

const QUESTIONS: Array<{ page: number; n: string; text: string; marks: number; answer: string }> = [
  { page: 1, n: '1', text: 'Balance: __ H2 + __ O2 -> __ H2O', marks: 1, answer: '2 H2 + O2 -> 2 H2O' },
  { page: 1, n: '2', text: 'Molar mass of H2O (g/mol)?', marks: 1, answer: '18.02 g/mol' },
  { page: 1, n: '3', text: 'Moles in 36.04 g of water? Show work.', marks: 2, answer: '36.04 / 18.02 = 2.00 mol (1 mark method, 1 mark answer)' },
  { page: 2, n: '4', text: 'Grams of O2 needed to make 2.00 mol H2O? Show work.', marks: 3, answer: '1.00 mol O2 (1), x 32.00 g/mol (1) = 32.0 g (1)' },
  { page: 2, n: '5', text: 'Limiting reagent: 4 mol H2 and 1 mol O2. Explain.', marks: 2, answer: 'O2 is limiting (1); needs 2 mol O2 for 4 mol H2 but only 1 mol (1)' },
  { page: 3, n: '6', text: 'Percent yield if 30.0 g H2O made, 36.04 g expected?', marks: 3, answer: '30.0 / 36.04 (1) x 100 (1) = 83.2% (1)' },
]

interface Student {
  name: string
  /** How the name is written on page 1 (null = blank). */
  written: string | null
  /** Written on later pages too (a misspelling shows how reads differ). */
  everyPage?: string
  faint?: boolean
  answers: Record<string, string>
}

const STUDENTS: Student[] = [
  { name: 'Mya Johnson', written: 'Mya Johnson', answers: { '1': '2 H2 + O2 -> 2 H2O', '2': '18.02', '3': '36.04/18.02 = 2 mol', '4': '1 mol O2 x 32 = 32 g', '5': 'O2, need 2 mol but have 1', '6': '30/36.04 x100 = 83.2%' } },
  { name: 'Carlos Rivera', written: 'Carlos Rivera', answers: { '1': 'H2 + O2 -> H2O', '2': '18', '3': '36.04/18 = 2', '4': '2 mol x 32 = 64 g', '5': 'H2 because there is more', '6': '36.04/30 = 120%' } },
  { name: 'Sean Miller', written: 'Sean Miller', everyPage: 'Sean Millr', answers: { '1': '2H2 + O2 -> 2H2O', '2': '18.02 g/mol', '3': '2.00 mol', '4': '32.0 g', '5': 'O2 is limiting', '6': '83%' } },
  { name: 'Priya Patel', written: 'Priya Patel', answers: { '1': '2 H2 + O2 -> 2 H2O', '2': '18.02', '3': '36.04 x 18.02 = 649', '4': '16 g', '5': 'O2, 4 H2 needs 2 O2', '6': '30/36.04 = .832' } },
  { name: 'Liam Chen', written: null, answers: { '1': '2 H2 + O2 -> 2 H2O', '2': '18.02', '3': '2 mol', '4': '1 x 32 = 32g', '5': 'O2', '6': '83.2 %' } },
  { name: 'Ava Kim', written: 'Kim, Ava', answers: { '1': 'H2 + O2 -> H2O2', '2': '34', '3': '1.06 mol', '4': '', '5': 'not sure', '6': '' } },
  { name: 'Noah Brooks', written: 'Noah Brooks', faint: true, answers: { '1': '2 H2 + O2 -> 2 H2O', '2': '18.02', '3': '36.04/18.02=2.00', '4': '1.00 mol x 32.00 = 32.0 g', '5': 'O2 limiting: 4 mol H2 needs 2 mol O2', '6': '(30.0/36.04)x100 = 83.2%' } },
  { name: 'Emma Davis', written: 'Emma Davis', answers: { '1': '2H2 + O2 = 2H2O', '2': '18.02', '3': '2', '4': '32', '5': 'Oxygen', '6': '83.2' } },
]

const W = 1275 // 150 dpi letter
const H = 1650

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function drawPage(student: Student, page: number, seed: number): Buffer {
  const rnd = seeded(seed)
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d') as SKRSContext2D
  ctx.fillStyle = '#f7f6f2'
  ctx.fillRect(0, 0, W, H)
  // A slight tilt, like a page that went through the feeder crooked.
  ctx.translate(W / 2, H / 2)
  ctx.rotate((rnd() - 0.5) * 0.02)
  ctx.translate(-W / 2, -H / 2)

  ctx.fillStyle = '#111'
  ctx.font = '28px sans-serif'
  ctx.fillText('Stoichiometry Quiz - AP Chemistry', 90, 110)
  ctx.font = '20px sans-serif'
  ctx.fillText(`Page ${page} of 3`, W - 220, 110)
  if (page === 1 || student.everyPage) {
    ctx.fillText('Name: ________________________   Period: ____', 90, 170)
    const written = page === 1 ? student.written : student.everyPage
    if (written) {
      ctx.fillStyle = student.faint ? 'rgba(40,40,90,0.45)' : '#1b2a6b'
      ctx.font = `${student.faint ? 34 : 40}px Hand`
      ctx.save()
      ctx.translate(180, 160)
      ctx.rotate(student.faint ? -0.06 : (rnd() - 0.5) * 0.04)
      ctx.fillText(written, 0, 0)
      ctx.restore()
      if (page === 1) ctx.fillText('2', 760, 160)
    }
  }

  let y = 260
  ctx.font = '22px sans-serif'
  for (const q of QUESTIONS.filter((x) => x.page === page)) {
    ctx.fillStyle = '#111'
    ctx.fillText(`${q.n}. ${q.text}   (${q.marks} mark${q.marks === 1 ? '' : 's'})`, 90, y)
    ctx.fillStyle = '#1b2a6b'
    ctx.font = '36px Hand'
    ctx.fillText(student.answers[q.n] ?? '', 130, y + 70)
    ctx.font = '22px sans-serif'
    y += 380
  }

  // Scanner speckle.
  const img = ctx.getImageData(0, 0, W, H)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 18
    for (let c = 0; c < 3; c++) img.data[i + c] = Math.max(0, Math.min(255, img.data[i + c] + n))
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toBuffer('image/jpeg', 80)
}

async function pdfOf(images: Buffer[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const jpg of images) {
    const img = await doc.embedJpg(jpg)
    doc.addPage([612, 792]).drawImage(img, { x: 0, y: 0, width: 612, height: 792 })
  }
  return doc.save()
}

// The stack, in copier order.
const stackPages: Buffer[] = []
STUDENTS.forEach((s, i) => {
  const pages = [1, 2, 3].map((p) => drawPage(s, p, (i + 1) * 100 + p))
  stackPages.push(...pages)
  void pdfOf(pages).then((bytes) => writeFileSync(join(out, 'one-file-each', `${s.name}.pdf`), bytes))
})
writeFileSync(join(out, 'class-stack.pdf'), await pdfOf(stackPages))

// The typed mark scheme.
const scheme = await PDFDocument.create()
const font = await scheme.embedFont(StandardFonts.Helvetica)
const page = scheme.addPage([612, 792])
page.drawText('Mark scheme: Stoichiometry Quiz (12 marks)', { x: 50, y: 740, size: 16, font })
QUESTIONS.forEach((q, i) => {
  page.drawText(`Q${q.n} (${q.marks}): ${q.answer}`, { x: 50, y: 700 - i * 30, size: 11, font })
})
writeFileSync(join(out, 'mark-scheme.pdf'), await scheme.save())

console.log(JSON.stringify({ out, students: STUDENTS.map((s) => s.name), pages: stackPages.length }))

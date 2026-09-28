// Pull a short text excerpt from uploaded class materials, in the browser, so
// the homepage can suggest a one-line description of what they cover. Only the
// excerpt (never the file) is sent to /api/describe-materials.

import { extractTextFromDOCX, extractTextFromPPTX } from './client-file-processor'
import { loadPdfJs } from './pdf-to-images'

const MAX_CHARS_PER_FILE = 2500

async function pdfExcerpt(file: File, maxPages = 4): Promise<string> {
  const pdfjs = await loadPdfJs()
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), verbosity: 0 }).promise
  let text = ''
  for (let p = 1; p <= Math.min(pdf.numPages, maxPages) && text.length < MAX_CHARS_PER_FILE; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    text += content.items.map((it: { str?: string }) => it.str ?? '').join(' ') + '\n'
  }
  return text
}

/** Best-effort excerpt; returns '' when the file has no extractable text (e.g. scanned PDF). */
export async function extractMaterialExcerpt(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  try {
    let text = ''
    if (ext === 'pptx') text = await extractTextFromPPTX(file)
    else if (ext === 'docx') text = await extractTextFromDOCX(file)
    else if (ext === 'pdf' || file.type === 'application/pdf') text = await pdfExcerpt(file)
    return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS_PER_FILE)
  } catch (err) {
    console.warn(`Could not read ${file.name} for a description:`, err)
    return ''
  }
}

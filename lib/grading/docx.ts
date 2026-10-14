// A minimal .docx writer (title, headings, paragraphs, bullets, numbered
// lines) for printable plans teachers attach in their lesson planner. jszip.

import JSZip from 'jszip'
import type { DocBlock } from './reteach-export'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function para(text: string, opts: { size?: number; bold?: boolean; color?: string; before?: number; after?: number; indent?: number } = {}): string {
  const rpr = `<w:rPr>${opts.bold ? '<w:b/>' : ''}${opts.color ? `<w:color w:val="${opts.color}"/>` : ''}<w:sz w:val="${opts.size ?? 22}"/></w:rPr>`
  const ppr = `<w:pPr><w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 80}"/>${opts.indent ? `<w:ind w:left="${opts.indent}" w:hanging="280"/>` : ''}</w:pPr>`
  return `<w:p>${ppr}<w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
}

export async function toDocx(blocks: DocBlock[]): Promise<Uint8Array> {
  const body = blocks.map((b) => {
    switch (b.kind) {
      case 'title': return para(b.text, { size: 36, bold: true, after: 60 })
      case 'subtitle': return para(b.text, { size: 20, color: '666666', after: 200 })
      case 'heading': return para(b.text, { size: 26, bold: true, color: '1D4ED8', before: 240, after: 80 })
      case 'bullet': return para(`•  ${b.text}`, { indent: 560 })
      case 'number': return para(`${b.n}.  ${b.text}`, { indent: 560 })
      default: return para(b.text)
    }
  }).join('')

  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`)
  return zip.generateAsync({ type: 'uint8array' })
}

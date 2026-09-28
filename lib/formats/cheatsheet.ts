// Parser for the "cheatsheet" study-guide format — a dense, printable one-page
// reference split into small boxes.
//
// Output contract (see the cheatsheet skeleton in lib/claude-api.ts):
//   # <Title>
//   *<description>*
//   ## <Box title>
//   <compact markdown: bullets, a small table, a formula, a code block>
//   ## <Box title>
//   …
// Only level-2 headings start a box; deeper headings stay inside it. Headings
// inside code fences are ignored.

import { stripEmoji, toTitleCase, plainText } from './normalize'

export type BoxTone = 'formula' | 'warning' | 'memory' | 'default'

export interface CheatBox {
  title: string
  body: string // markdown
  tone: BoxTone
}

export interface ParsedCheatSheet {
  title: string | null
  description: string | null
  intro: string // any markdown before the first box
  boxes: CheatBox[]
}

export function boxTone(title: string): BoxTone {
  const t = title.toLowerCase()
  if (/mistake|pitfall|trap|watch out|avoid|gotcha|don't|common error/.test(t)) return 'warning'
  if (/mnemonic|remember|memory|trick/.test(t)) return 'memory'
  if (/formula|equation|identit|law|rule of thumb|complexit|constant/.test(t)) return 'formula'
  return 'default'
}

export function parseCheatSheet(content: string): ParsedCheatSheet {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const sheet: ParsedCheatSheet = { title: null, description: null, intro: '', boxes: [] }
  let box: CheatBox | null = null
  let fence: string | null = null

  const append = (raw: string) => {
    if (box) box.body += (box.body ? '\n' : '') + raw
    else sheet.intro += (sheet.intro ? '\n' : '') + raw
  }
  const closeBox = () => {
    if (box && box.body.trim()) sheet.boxes.push({ ...box, body: box.body.trim() })
    box = null
  }

  for (const raw of lines) {
    const t = raw.trim()
    if (fence) {
      append(raw)
      if (t.startsWith(fence)) fence = null
      continue
    }
    const f = t.match(/^(`{3,}|~{3,})/)
    if (f) {
      fence = f[1]
      append(raw)
      continue
    }

    const h = t.match(/^(#{1,2})\s+(.+)$/)
    if (h) {
      const text = toTitleCase(plainText(stripEmoji(h[2])).trim())
      if (h[1].length === 1) {
        if (!sheet.title) sheet.title = text
        continue
      }
      closeBox()
      box = { title: text, body: '', tone: boxTone(text) }
      continue
    }

    if (!box && !sheet.description && !sheet.intro.trim()) {
      const italic = t.match(/^\*([^*].*[^*])\*$/) || t.match(/^_(.+)_$/)
      if (italic) {
        sheet.description = italic[1].trim()
        continue
      }
    }
    append(raw)
  }
  closeBox()
  sheet.intro = sheet.intro.trim()
  return sheet
}

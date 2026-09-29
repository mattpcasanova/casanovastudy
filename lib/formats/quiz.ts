// Parser for the "quiz" study-guide format (see the quiz skeleton in
// lib/claude-api.ts). Line-based: MC_QUESTION / TF_QUESTION / SA_QUESTION
// markers, option lines, "Correct Answer:", "Explanation:". A ```graph fence
// directly under a question line (or right before it) becomes that
// question's figure. Other fences are dropped so their lines are never read as
// options. Question ids (q-0, q-1, ...) follow document order.

import { stripEmoji, toTitleCase, plainText } from './normalize'
import { GRAPH_FENCE_LANGS } from '@/lib/graphs/spec'

interface BaseQuestion {
  id: string
  question: string
  section: string
  explanation?: string
  /** Body of a ```graph fence (lib/graphs/spec.ts). */
  figure?: string
}
export interface MultipleChoiceQuestion extends BaseQuestion { type: 'mc'; options: string[]; correctAnswer: string }
export interface TrueFalseQuestion extends BaseQuestion { type: 'tf'; correctAnswer: boolean }
export interface ShortAnswerQuestion extends BaseQuestion { type: 'sa'; sampleAnswer: string }
export type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion

const FIG = /^§FIG (\d+)§$/

/** Pulls fenced blocks out before the line parser trims them. Graph fences become §FIG n§ lines. */
function extractFences(content: string): { lines: string[]; figures: string[] } {
  const out: string[] = []
  const figures: string[] = []
  const raw = content.split('\n')
  for (let i = 0; i < raw.length; i++) {
    const open = raw[i].match(/^\s*(`{3,}|~{3,})\s*([\w+#.-]*)/)
    if (!open) { out.push(raw[i]); continue }
    const marker = open[1]
    const body: string[] = []
    let j = i + 1
    for (; j < raw.length; j++) {
      const t = raw[j].trim()
      if (t.startsWith(marker[0].repeat(marker.length)) && /^(`{3,}|~{3,})\s*$/.test(t)) break
      body.push(raw[j])
    }
    if (GRAPH_FENCE_LANGS.test(open[2])) {
      out.push(`§FIG ${figures.length}§`)
      figures.push(body.join('\n'))
    }
    i = j
  }
  return { lines: out, figures }
}

export function parseQuizContent(content: string): Question[] {
  const questions: Question[] = []
  const extracted = extractFences(content)
  const lines = extracted.lines.map((l) => l.trim()).filter(Boolean)
  const claimed = new Set<number>() // figure lines already attached to a question
  let pendingFigure: number | null = null // a figure placed just before its question
  let section = ''

  /** The figure in a question's block (before its first option/answer), else one placed just before it. */
  const figureFor = (start: number, end: number): string | undefined => {
    for (let j = start + 1; j < end; j++) {
      const l = lines[j]
      if (isQuestion(l) || /^#{1,6}\s/.test(l)) break
      const m = l.match(FIG)
      if (m) { claimed.add(j); pendingFigure = null; return extracted.figures[Number(m[1])] }
      if (!/^\*{0,2}\(?[A-F][).:]/.test(l) && !/answer\s*:/i.test(l)) continue
      break
    }
    if (pendingFigure !== null) {
      const f = extracted.figures[pendingFigure]
      pendingFigure = null
      return f
    }
    return undefined
  }

  const strip = (s: string) => stripEmoji(s).replace(/^\*\*\s*|\s*\*\*$/g, '').trim()
  const questionText = (line: string, tag: string) =>
    strip(line.replace(new RegExp(`\\*{0,2}${tag}_QUESTION:\\*{0,2}`), ''))
  const isQuestion = (l: string) => /(MC|TF|SA)_QUESTION:/.test(l)
  const explanationOf = (l: string) => {
    const m = l.match(/^\*{0,2}(?:explanation|why)\s*:\*{0,2}\s*(.+)$/i)
    return m ? strip(m[1]) : null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const fig = line.match(FIG)
    if (fig) {
      if (!claimed.has(i)) pendingFigure = Number(fig[1])
      continue
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      pendingFigure = null
      const title = toTitleCase(plainText(stripEmoji(heading[1])).replace(/^[\s|:\-–—]+/, '').trim())
      if (title && !/^(quiz|learning objectives|key term)/i.test(title)) section = title
      continue
    }

    if (line.includes('MC_QUESTION:')) {
      const text = questionText(line, 'MC')
      if (!text) continue
      const figure = figureFor(i, Math.min(i + 16, lines.length))
      const options: string[] = []
      const stem: string[] = [] // lines before the options: I./II./III. statements, data, a short passage
      let correctAnswer = ''
      let explanation: string | undefined
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const l = lines[j]
        if (isQuestion(l) || /^#{1,6}\s/.test(l)) break
        if (FIG.test(l)) continue
        const opt = l.match(/^\*{0,2}\(?([A-F])[).:]\*{0,2}\s+(.+)$/)
        const exp = explanationOf(l)
        if (exp) explanation = exp
        else if (opt && !/answer/i.test(l.slice(0, 12))) options.push(strip(opt[2]))
        else if (!options.length && !/answer\s*:/i.test(l)) stem.push(strip(l))
        else if (/answer\s*:/i.test(l)) {
          const m = l.match(/answer:?\**\s*:?\s*\(?([A-F])\b/i)
          if (m) {
            const idx = m[1].toUpperCase().charCodeAt(0) - 65
            if (idx >= 0 && idx < options.length) correctAnswer = options[idx]
          }
        }
      }
      if (options.length > 0) {
        questions.push({ type: 'mc', id: `q-${questions.length}`, question: [text, ...stem].join('\n'), options, correctAnswer: correctAnswer || options[0], section, explanation, ...(figure ? { figure } : {}) })
      }
    } else if (line.includes('TF_QUESTION:')) {
      const text = questionText(line, 'TF')
      if (!text) continue
      const figure = figureFor(i, Math.min(i + 6, lines.length))
      let correctAnswer = true
      let explanation: string | undefined
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const l = lines[j]
        if (isQuestion(l) || /^#{1,6}\s/.test(l)) break
        if (FIG.test(l)) continue
        const exp = explanationOf(l)
        if (exp) explanation = exp
        else if (/answer\s*:/i.test(l)) correctAnswer = /true/i.test(l.split(/answer\s*:/i)[1] ?? '')
      }
      questions.push({ type: 'tf', id: `q-${questions.length}`, question: text, correctAnswer, section, explanation, ...(figure ? { figure } : {}) })
    } else if (line.includes('SA_QUESTION:')) {
      const text = questionText(line, 'SA')
      if (!text) continue
      const figure = figureFor(i, Math.min(i + 10, lines.length))
      let sampleAnswer = ''
      let explanation: string | undefined
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const l = lines[j]
        if (isQuestion(l) || /^#{1,6}\s/.test(l)) break
        if (FIG.test(l)) continue
        const exp = explanationOf(l)
        if (exp) { explanation = exp; continue }
        if (/^\*{0,2}(?:sample |model )?answer\s*:/i.test(l)) {
          sampleAnswer = strip(l.replace(/^\*{0,2}(?:sample |model )?answer\s*:\*{0,2}\s*/i, ''))
          for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
            const next = lines[k]
            if (isQuestion(next) || FIG.test(next) || /^#{1,6}\s/.test(next) || /^([-*_]\s*){3,}$/.test(next) || explanationOf(next)) break
            sampleAnswer += ' ' + strip(next)
          }
        }
      }
      questions.push({ type: 'sa', id: `q-${questions.length}`, question: text, sampleAnswer: sampleAnswer || 'A complete answer covering the key concepts from the study material.', section, explanation, ...(figure ? { figure } : {}) })
    }
  }

  // One section name for the whole quiz adds nothing.
  if (new Set(questions.map((q) => q.section)).size <= 1) questions.forEach((q) => { q.section = '' })
  return questions
}


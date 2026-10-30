"use client"

// A reading passage above a question (SAT Reading and Writing items, grammar
// in context, notes for a synthesis item). Paragraphs split on blank lines,
// "- " lines become a list, "Text 1" / "Text 2" labels are bold, [[...]] is
// the underlined sentence a question refers to, ______ is a blank.

import { InlineMarkdown } from './study-markdown'
import { highlightCode, languageLabel } from './code-view'

const FENCE = /^```([\w+#.-]*)\n([\s\S]*?)\n```\n?/
const CODE = /^```([\w+#.-]+)\n([\s\S]*?)\n```$/

/** Splits a leading ```passage fence (or a code fence, kept whole) off a prompt (Learn and practice carry it inside the text). */
export function splitPassage(text: string): { passage?: string; text: string } {
  const m = text.match(FENCE)
  if (!m) return { text }
  if (/^(passage|text)$/i.test(m[1])) return { passage: m[2].trim(), text: text.slice(m[0].length) }
  if (m[1]) return { passage: m[0].trim(), text: text.slice(m[0].length) }
  return { text }
}

function Line({ text }: { text: string }) {
  // [[underlined]] → <u>; keep everything else for InlineMarkdown.
  const parts = text.split(/(\[\[[^\]]*\]\])/)
  return (
    <>
      {parts.map((p, i) => {
        const u = p.match(/^\[\[([^\]]*)\]\]$/)
        return u ? <u key={i} className="decoration-slate-500 underline-offset-2"><InlineMarkdown text={u[1]} /></u> : <InlineMarkdown key={i} text={p} />
      })}
    </>
  )
}

// Spans only (a passage sits inside a <p>), so no <pre> or <div>: a block span with pre-wrap whitespace.
function CodePassage({ lang, text }: { lang: string; text: string }) {
  const { html, lang: resolved } = highlightCode(text.replace(/\n+$/, ''), lang)
  return (
    <span className="study-code mb-4 block overflow-hidden rounded-xl bg-slate-900 text-left font-sans text-base font-normal shadow-sm ring-1 ring-slate-800 print:break-inside-avoid">
      <span className="block border-b border-white/10 px-4 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-slate-400">{resolved ? languageLabel(resolved) : 'Code'}</span>
      <span className="block overflow-x-auto px-4 py-3 font-mono text-[0.82rem] leading-relaxed text-slate-100">
        <code className="hljs block whitespace-pre" dangerouslySetInnerHTML={{ __html: html }} />
      </span>
    </span>
  )
}

export function Passage({ text }: { text: string }) {
  // Code the question is about (a ```java fence kept whole by the quiz parser).
  const code = text.trim().match(CODE)
  if (code) return <CodePassage lang={code[1]} text={code[2]} />
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return (
    <span className="mb-4 block rounded-xl border border-slate-200 bg-[#fbfaf7] px-5 py-4 font-serif text-[1.02rem] font-normal leading-relaxed text-slate-800">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        const isList = lines.length > 0 && lines.every((l) => /^[-•*]\s+/.test(l))
        if (isList) {
          return (
            <span key={i} className="mb-3 block space-y-1 pl-5 last:mb-0">
              {lines.map((l, j) => <span key={j} className="block list-item"><Line text={l.replace(/^[-•*]\s+/, '')} /></span>)}
            </span>
          )
        }
        const label = lines.length === 1 && /^text \d$/i.test(lines[0])
        return (
          <span key={i} className={label ? 'mb-1 mt-2 block font-sans text-sm font-semibold text-slate-900 first:mt-0' : 'mb-3 block last:mb-0'}>
            {lines.map((l, j) => <span key={j}>{j > 0 && ' '}<Line text={l} /></span>)}
          </span>
        )
      })}
    </span>
  )
}

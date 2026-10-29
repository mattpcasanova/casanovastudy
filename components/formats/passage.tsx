"use client"

// A reading passage above a question (SAT Reading and Writing items, grammar
// in context, notes for a synthesis item). Paragraphs split on blank lines,
// "- " lines become a list, "Text 1" / "Text 2" labels are bold, [[...]] is
// the underlined sentence a question refers to, ______ is a blank.

import { InlineMarkdown } from './study-markdown'

const FENCE = /^```(?:passage|text)\n([\s\S]*?)\n```\n?/

/** Splits a leading ```passage fence off a prompt (Learn and practice carry it inside the text). */
export function splitPassage(text: string): { passage?: string; text: string } {
  const m = text.match(FENCE)
  return m ? { passage: m[1].trim(), text: text.slice(m[0].length) } : { text }
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

export function Passage({ text }: { text: string }) {
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

"use client"

// Syntax-highlighted code for study guides and practice activities.
// highlight.js escapes the source it returns, so injecting its HTML output is
// safe; raw code is never injected unescaped. Token colors live in globals.css
// under `.study-code` (dark theme, light when printed).

import { memo, useMemo, useState } from 'react'
import hljs from 'highlight.js/lib/common'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALIASES: Record<string, string> = {
  py: 'python', js: 'javascript', ts: 'typescript', 'c++': 'cpp', cs: 'csharp', 'c#': 'csharp',
  sh: 'bash', shell: 'bash', zsh: 'bash', html: 'xml', golang: 'go', rb: 'ruby', kt: 'kotlin', yml: 'yaml',
}

const LABELS: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#',
  go: 'Go', rust: 'Rust', sql: 'SQL', bash: 'Bash', json: 'JSON', xml: 'HTML', css: 'CSS', kotlin: 'Kotlin',
  swift: 'Swift', ruby: 'Ruby', php: 'PHP', r: 'R', yaml: 'YAML', pseudocode: 'Pseudocode', pseudo: 'Pseudocode',
}

// Only auto-detect when the text plausibly is code — prose in a fence stays plain.
const LOOKS_LIKE_CODE = /[;{}]|=>|\b(def|function|return|class|import|const|let|var|for|while|if|elif|print|public|static|void|SELECT)\b/

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Highlighted HTML for `text` (always HTML-escaped). */
export function highlightCode(text: string, lang: string): { html: string; lang: string } {
  const key = ALIASES[lang.toLowerCase()] ?? lang.toLowerCase()
  try {
    if (key && hljs.getLanguage(key)) return { html: hljs.highlight(text, { language: key, ignoreIllegals: true }).value, lang: key }
    if (LOOKS_LIKE_CODE.test(text)) {
      const auto = hljs.highlightAuto(text)
      if (auto.relevance >= 5) return { html: auto.value, lang: key || auto.language || '' }
    }
  } catch {
    // fall through to plain text
  }
  return { html: escapeHtml(text), lang: key }
}

export function languageLabel(lang: string): string {
  const key = ALIASES[lang.toLowerCase()] ?? lang.toLowerCase()
  return LABELS[key] ?? lang
}

/**
 * Split highlighted HTML into per-line HTML, closing spans at each newline and
 * reopening them on the next line so multi-line tokens (strings, comments)
 * stay colored when lines are rendered separately.
 */
export function splitHighlightedLines(html: string): string[] {
  const lines: string[] = []
  const open: string[] = []
  let line = ''
  for (const tok of html.match(/<span[^>]*>|<\/span>|\n|[^<\n]+/g) ?? []) {
    if (tok === '\n') {
      lines.push(line + '</span>'.repeat(open.length))
      line = open.join('')
    } else if (tok.startsWith('<span')) {
      open.push(tok)
      line += tok
    } else if (tok === '</span>') {
      open.pop()
      line += tok
    } else {
      line += tok
    }
  }
  lines.push(line + '</span>'.repeat(open.length))
  return lines
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.7rem] font-medium text-slate-400 transition hover:bg-white/10 hover:text-white print:hidden"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Dark code block with a language label and a copy button. */
export const CodeBlock = memo(function CodeBlock({ lang, text, className, compact = false }: { lang: string; text: string; className?: string; compact?: boolean }) {
  const clean = text.replace(/\n+$/, '')
  const { html, lang: resolved } = useMemo(() => highlightCode(clean, lang), [clean, lang])
  return (
    <div className={cn('study-code not-prose overflow-hidden rounded-xl bg-slate-900 shadow-sm ring-1 ring-slate-800 print:break-inside-avoid', compact ? 'my-3' : 'my-5', className)}>
      <div className="flex items-center justify-between border-b border-white/10 py-1 pl-4 pr-2">
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-slate-400">{resolved ? languageLabel(resolved) : 'Code'}</span>
        <CopyButton text={clean} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.82rem] leading-relaxed text-slate-100">
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
})

/**
 * Numbered, clickable code lines (for "find the bug"). `state` colors a line
 * after checking: 'correct' (the real bug), 'wrong' (the student's miss).
 */
export function CodeLines({
  lang,
  text,
  onPick,
  picked,
  lineState,
  disabled,
}: {
  lang: string
  text: string
  onPick?: (line: number) => void
  picked?: number | null
  lineState?: (line: number) => 'correct' | 'wrong' | null
  disabled?: boolean
}) {
  const { html, lang: resolved } = useMemo(() => highlightCode(text.replace(/\n+$/, ''), lang), [text, lang])
  const lines = useMemo(() => splitHighlightedLines(html), [html])
  const gutter = String(lines.length).length
  return (
    <div className="study-code not-prose my-3 overflow-hidden rounded-xl bg-slate-900 shadow-sm ring-1 ring-slate-800">
      <div className="flex items-center justify-between border-b border-white/10 py-1 pl-4 pr-2">
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-slate-400">{resolved ? languageLabel(resolved) : 'Code'}</span>
        <CopyButton text={text} />
      </div>
      <div className="overflow-x-auto py-2" role={onPick ? 'listbox' : undefined} aria-label={onPick ? 'Code lines: pick the line with the bug' : undefined}>
        {lines.map((lineHtml, idx) => {
          const n = idx + 1
          const st = lineState?.(n) ?? null
          const isPicked = picked === n
          const Row = onPick ? 'button' : 'div'
          return (
            <Row
              key={n}
              type={onPick ? 'button' : undefined}
              role={onPick ? 'option' : undefined}
              aria-selected={onPick ? isPicked : undefined}
              disabled={onPick ? disabled : undefined}
              onClick={onPick && !disabled ? () => onPick(n) : undefined}
              className={cn(
                'flex w-full min-w-fit items-stretch border-l-4 text-left font-mono text-[0.82rem] leading-relaxed outline-none transition-colors',
                st === 'correct' ? 'border-l-emerald-400 bg-emerald-500/20' : st === 'wrong' ? 'border-l-rose-400 bg-rose-500/20' : isPicked ? 'border-l-orange-400 bg-orange-500/15' : 'border-l-transparent',
                onPick && !disabled && 'cursor-pointer hover:bg-white/5 focus-visible:bg-white/10'
              )}
            >
              <span className="select-none px-3 text-right text-slate-500" style={{ minWidth: `${gutter + 2}ch` }}>{n}</span>
              <code className="hljs whitespace-pre pr-4 text-slate-100" dangerouslySetInnerHTML={{ __html: lineHtml || ' ' }} />
            </Row>
          )
        })}
      </div>
    </div>
  )
}

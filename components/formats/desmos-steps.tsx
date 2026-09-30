"use client"

// A ```desmos block in an Explain answer: the expressions a "Solve it in
// Desmos" walkthrough tells the student to type, shown as math, with a button
// that types them into the calculator (and loads any data table / window).

import { useMemo } from 'react'
import katex from 'katex'
import { Calculator, CornerDownLeft } from 'lucide-react'
import { parseDesmosBlock } from '@/lib/graphs/desmos-setup'
import { useDesmos } from '@/components/desmos/desmos-context'

export function DesmosSteps({ text }: { text: string }) {
  const desmos = useDesmos()
  const setup = useMemo(() => parseDesmosBlock(text), [text])
  if (!setup.expressions.length && !setup.table) return null
  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50">
      <p className="flex items-center gap-2 border-b border-blue-100 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
        <Calculator className="h-3.5 w-3.5" /> Type into Desmos
      </p>
      <ol className="space-y-1.5 px-3.5 py-3">
        {setup.table && (
          <li className="text-sm text-slate-700">
            <span className="font-semibold">Table:</span> {setup.table.map((p) => `(${p[0]}, ${p[1]})`).join(', ')}
          </li>
        )}
        {setup.expressions.map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-xs font-semibold text-blue-700">{i + 1}</span>
            <span
              className="rounded-md bg-white px-2 py-1 text-[0.95rem] ring-1 ring-inset ring-blue-100"
              dangerouslySetInnerHTML={{ __html: katex.renderToString(e.replace(/\\sim/g, '\\sim '), { throwOnError: false, strict: 'ignore' }) }}
            />
          </li>
        ))}
      </ol>
      {desmos?.graphing ? (
        <div className="border-t border-blue-100 px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => desmos.load(setup)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <CornerDownLeft className="h-4 w-4" /> Load into Desmos
          </button>
          <span className="ml-2 text-xs text-slate-500">Then try typing them yourself next time.</span>
        </div>
      ) : null}
    </div>
  )
}

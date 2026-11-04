"use client"

// What a regrade covers: just the questions the teacher picks (quick, and
// the rest of the report stays as it is), or the whole paper. Used by the
// report's Regrade dialog and "Regrade all papers" on class results.

import { cn } from "@/lib/utils"

/** `null` = the whole paper; a list = only those questions. */
export type RegradeScope = string[] | null

export function QuestionPicker({ questions, value, onChange, wholeLabel = "The whole paper" }: {
  questions: string[]
  value: RegradeScope
  onChange: (value: RegradeScope) => void
  wholeLabel?: string
}) {
  const some = value !== null
  const picked = new Set(value ?? [])
  const toggle = (q: string) => onChange(picked.has(q) ? (value ?? []).filter((x) => x !== q) : questions.filter((x) => x === q || picked.has(x)))
  const tab = (on: boolean) => cn("rounded-xl px-3 py-2 text-sm font-semibold ring-1", on ? "bg-blue-50 text-blue-900 ring-blue-300" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="What to regrade">
        <button type="button" className={tab(some)} aria-pressed={some} onClick={() => { if (!some) onChange([]) }}>Just some questions</button>
        <button type="button" className={tab(!some)} aria-pressed={!some} onClick={() => onChange(null)}>{wholeLabel}</button>
      </div>
      {some && (
        <div>
          <p className="text-sm text-slate-600">Pick the questions to grade again. It&apos;s quicker, and everything else on the report stays as it is, your edits included.</p>
          <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto p-0.5" role="group" aria-label="Questions">
            {questions.map((q) => (
              <button key={q} type="button" aria-pressed={picked.has(q)} onClick={() => toggle(q)}
                className={cn("h-10 min-w-10 rounded-xl px-3 text-sm font-semibold ring-1", picked.has(q) ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-slate-800 ring-slate-300 hover:bg-slate-50")}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

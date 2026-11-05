// The standards a guide was written to (study_guides.standards), above the
// guide and on the printout. Only ever what the teacher or parent typed.

import { standardEntries } from "@/lib/standards"

export function GuideStandards({ standards }: { standards?: string | null }) {
  const entries = standardEntries(standards)
  if (!entries.length) return null
  return (
    <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-baseline gap-x-2 gap-y-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm print:mb-4 print:rounded-none print:border-0 print:border-b print:border-slate-300 print:px-0 print:py-2 print:shadow-none">
      <span className="font-semibold text-slate-900">{entries.filter((e) => e.code).length === 1 && entries.length <= 2 ? "Standard" : "Standards"}</span>
      {entries.map((e, i) => e.code
        ? <span key={i} className="rounded-lg bg-slate-100 px-2 py-0.5 font-semibold tabular-nums text-slate-800 print:bg-transparent print:px-0">{e.text}</span>
        : <span key={i} className="text-slate-700">{e.text}</span>)}
    </div>
  )
}

// Shared layout for /privacy and /terms: title, effective date, a contents
// list and numbered sections, in the site's display serif.

import type { ReactNode } from "react"
import Link from "next/link"
import NavigationHeader from "@/components/navigation-header"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

export function LegalPage({ title, effective, intro, sections, other }: { title: string; effective: string; intro: ReactNode; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl")}>{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Effective {effective}</p>
        <div className="mt-6 space-y-3 text-[0.95rem] leading-relaxed text-slate-700">{intro}</div>

        <nav aria-label="Contents" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Contents</p>
          <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-blue-700 hover:underline">{i + 1}. {s.title}</a></li>)}
          </ol>
        </nav>

        <div className="mt-8 space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>{i + 1}. {s.title}</h2>
              <div className="legal-body mt-3 space-y-3 text-[0.95rem] leading-relaxed text-slate-700 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-slate-900 [&_ul]:space-y-1.5">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          See also our <Link href={other.href} className="font-semibold text-blue-700 hover:underline">{other.label}</Link>. Questions: <a href="mailto:privacy@casanovastudy.com" className="font-semibold text-blue-700">privacy@casanovastudy.com</a>.
        </p>
      </main>
    </div>
  )
}

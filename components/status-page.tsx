"use client"

// Shared look for the 404 and error screens: the site header, a brand-blue
// hero with a large serif headline, and a white card of next steps that
// overlaps it (same shape as the homepage and grading pages).

import type { ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

export interface StatusAction {
  label: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
  primary?: boolean
}

export function StatusPage({ eyebrow, title, message, actions, footer }: { eyebrow: string; title: string; message: ReactNode; actions: StatusAction[]; footer?: ReactNode }) {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-28 pt-14 text-white sm:pt-20">
        <div className="pointer-events-none absolute -top-24 right-[12%] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">{eyebrow}</p>
          <h1 className={cn(fontDisplay, "mt-3 text-4xl font-semibold tracking-tight sm:text-5xl")}>{title}</h1>
        </div>
      </div>

      <main className="relative mx-auto -mt-20 max-w-xl px-4 pb-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-900/5 sm:p-8">
          <div className="space-y-2 text-center text-[0.95rem] leading-relaxed text-slate-600">{message}</div>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {actions.map((a, i) => {
              const cls = cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                a.primary
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                a.primary && actions.length % 2 === 1 && i === 0 && "sm:col-span-2",
              )
              const body = <><a.icon className="h-4 w-4" />{a.label}</>
              return a.href
                ? <Link key={a.label} href={a.href} className={cls}>{body}</Link>
                : <button key={a.label} type="button" onClick={a.onClick} className={cls}>{body}</button>
            })}
          </div>
          {footer && <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">{footer}</p>}
        </div>
      </main>
    </div>
  )
}

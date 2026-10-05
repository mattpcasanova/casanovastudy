"use client"

// /pricing: Free vs Premium, monthly/yearly toggle, parent checkout, schools,
// FAQ. Checkout isn't built yet (it waits for the LLC + Stripe), so the
// Premium buttons say "coming soon" and the code box is the working path.

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, GraduationCap, Minus, Send, Ticket } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import { PremiumBadge, PremiumMark } from "@/components/plan/premium-mark"
import { usePlan } from "@/components/plan/plan-provider"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { FREE_FEATURES, PREMIUM_FEATURES, PRICES, PRICING_FAQ, money, yearlyPerMonth, yearlySavingsPercent, type PlanFeature } from "@/lib/pricing"
import { cn } from "@/lib/utils"

type Billing = "yearly" | "monthly"

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("yearly")
  const { isPremium, openRedeem } = usePlan()
  const yearly = billing === "yearly"

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />

      <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-36 pt-14 text-white sm:pt-20">
        <div className="pointer-events-none absolute -top-24 right-[12%] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Plans</p>
          <h1 className={cn(fontDisplay, "mt-3 text-4xl font-semibold tracking-tight sm:text-5xl")}>Study free. Go Premium before the big test.</h1>
          <p className="mx-auto mt-4 max-w-lg text-blue-50">Everyone gets study guides, Learn mode and the Progress page. Premium adds every format, harder questions and a tutor that knows your weak spots.</p>

          <div role="radiogroup" aria-label="Billing period" className="mt-8 inline-flex rounded-full bg-white/15 p-1 backdrop-blur-sm">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={billing === b}
                onClick={() => setBilling(b)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors", billing === b ? "bg-white text-blue-700 shadow-sm" : "text-white/90 hover:text-white")}
              >
                {b === "monthly" ? "Monthly" : <>Yearly <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold", billing === b ? "bg-emerald-100 text-emerald-700" : "bg-white/20")}>Save {yearlySavingsPercent}%</span></>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="relative mx-auto -mt-28 max-w-4xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Free */}
          <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-900/5 sm:p-8">
            <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>Free</h2>
            <p className="mt-1 text-sm text-slate-500">For trying it out and everyday review</p>
            <p className="mt-6 flex items-baseline gap-1"><span className="text-4xl font-bold tracking-tight text-slate-900">$0</span><span className="text-slate-500">forever</span></p>
            <p className="mt-1 h-5 text-sm text-slate-500" />
            <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Make a study guide</Link>
            <FeatureList features={FREE_FEATURES} />
          </section>

          {/* Premium */}
          <section className="relative flex flex-col rounded-3xl border-2 border-blue-500 bg-white p-6 shadow-2xl shadow-blue-900/15 sm:p-8">
            <PremiumBadge className="absolute -top-3 left-6" />
            <h2 className={cn(fontDisplay, "flex items-center gap-2 text-2xl font-semibold text-slate-900")}>Premium <PremiumMark className="h-6 w-6" /></h2>
            <p className="mt-1 text-sm text-slate-500">For test prep and serious studying</p>
            <p className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-slate-900">{money(yearly ? yearlyPerMonth : PRICES.monthly)}</span>
              <span className="text-slate-500">/ month</span>
            </p>
            <p className="mt-1 h-5 text-sm text-slate-500">{yearly ? `${money(PRICES.yearly)} billed once a year` : "Billed monthly, cancel any time"}</p>
            {isPremium ? (
              <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">You&apos;re on Premium</p>
            ) : (
              <>
                <button type="button" disabled className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white opacity-60">
                  Try it free for {PRICES.trialDays} days · coming soon
                </button>
                <button type="button" onClick={openRedeem} className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
                  <Ticket className="h-4 w-4" /> Have a code from your teacher?
                </button>
              </>
            )}
            <FeatureList features={PREMIUM_FEATURES} premium />
          </section>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Send className="h-4 w-4 text-blue-600" />Want a parent to pay?</h3>
            <p className="mt-2 text-sm text-slate-600">Send them a checkout link. They pay with their card, and Premium turns on in your account. You never need their card details.</p>
            <button type="button" disabled className="mt-4 cursor-not-allowed rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">Send to a parent · coming soon</button>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><GraduationCap className="h-4 w-4 text-blue-600" />For schools and teachers</h3>
            <p className="mt-2 text-sm text-slate-600">Premium for every student, priced per student per year, with school sign-in and a student data privacy agreement.</p>
            <Link href="/schools" className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">See school plans</Link>
          </section>
        </div>

        <section className="mt-14">
          <h2 className={cn(fontDisplay, "text-center text-3xl font-semibold text-slate-900")}>Questions</h2>
          <div className="mx-auto mt-6 max-w-2xl divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
            {PRICING_FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function FeatureList({ features, premium }: { features: PlanFeature[]; premium?: boolean }) {
  return (
    <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-6">
      {features.map((f) => (
        <li key={f.text} className={cn("flex gap-2.5 text-sm", f.missing ? "text-slate-400" : "text-slate-700")}>
          {f.missing
            ? <Minus className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            : <Check className={cn("mt-0.5 h-4 w-4 shrink-0", premium ? "text-blue-600" : "text-emerald-600")} />}
          {f.text}
        </li>
      ))}
    </ul>
  )
}

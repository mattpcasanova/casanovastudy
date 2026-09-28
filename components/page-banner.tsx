"use client"

import type { LucideIcon } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fontDisplay, type FormatAccent } from '@/lib/formats/design'

interface PageBannerProps {
  title: string
  /** Small uppercase meta line, e.g. "College · Summary". */
  meta?: string
  accent: FormatAccent
  icon: LucideIcon
  /** Format label shown as a pill (e.g. "Flashcards"). */
  label?: string
  onBack?: () => void
  backLabel?: string
}

/**
 * Shared study-guide header: one brand-blue banner for every format so guides
 * feel like one product; the format is signalled by a white icon tile and a
 * pill tinted in the format's accent color — distinct, but not a whole new
 * color scheme per page.
 *
 * Requires an ancestor to define the --font-display variable (displaySerif.variable)
 * for the serif title.
 */
export default function PageBanner({ title, meta, accent, icon: Icon, label, onBack, backLabel = 'Back' }: PageBannerProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 text-white print:hidden">
      <div className="pointer-events-none absolute -top-24 right-[12%] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-72 rounded-full bg-white/10 blur-3xl" />

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 sm:left-6 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      )}

      <div className="container relative mx-auto px-4 pb-11 pt-14">
        <div className="flex flex-col items-center text-center">
          <span className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg shadow-blue-900/20', accent.text)}>
            <Icon className="h-6 w-6" />
          </span>
          <h1 className={cn(fontDisplay, 'max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl')}>
            {title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
            {label && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm', accent.text)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', accent.solid)} />
                {label}
              </span>
            )}
            {meta && <span className="text-blue-50/90">{meta}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

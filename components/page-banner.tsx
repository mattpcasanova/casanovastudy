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
  onBack?: () => void
  backLabel?: string
}

/**
 * Shared page/sub-nav header: a refined gradient banner in the section's accent
 * color, with an icon badge, serif title, and meta line. Reusable across the
 * study-guide viewer and other sub-nav pages.
 *
 * Requires an ancestor to define the --font-display variable (displaySerif.variable)
 * for the serif title.
 */
export default function PageBanner({ title, meta, accent, icon: Icon, onBack, backLabel = 'Back' }: PageBannerProps) {
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br text-white print:hidden', accent.bannerFrom, accent.bannerTo)}>
      {/* Soft depth glows — inviting without clutter */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-black/10 blur-2xl" />

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

      <div className="container relative mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <span className={cn('mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-white/25 backdrop-blur-sm', accent.iconBadge)}>
            <Icon className="h-6 w-6" />
          </span>
          <h1 className={cn(fontDisplay, 'text-3xl sm:text-4xl font-semibold tracking-tight leading-tight')}>
            {title}
          </h1>
          {meta && (
            <p className={cn('mt-2.5 text-xs sm:text-sm font-medium uppercase tracking-[0.14em]', accent.bannerSub)}>
              {meta}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

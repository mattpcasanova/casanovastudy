"use client"

// Shared building blocks for the "library" pages (My Guides, My Reports):
// a brand header, a compact filter toolbar, and the card selection checkbox.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fontDisplay } from '@/lib/formats/design'

export function LibraryHeader({ title, subtitle, count, noun, actionHref, actionLabel }: {
  title: string
  subtitle: string
  count?: number
  noun: string
  actionHref: string
  actionLabel: string
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 text-white">
      <div className="pointer-events-none absolute -top-24 right-[12%] h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="container relative mx-auto flex flex-col gap-5 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={cn(fontDisplay, 'text-3xl font-semibold tracking-tight sm:text-4xl')}>{title}</h1>
          <p className="mt-1.5 text-blue-50/90">
            {subtitle}
            {typeof count === 'number' && count > 0 && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-semibold">{count} {noun}{count === 1 ? '' : 's'}</span>}
          </p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-blue-700 shadow-lg shadow-blue-900/20 transition hover:bg-blue-50"
        >
          <Plus className="h-5 w-5" /> {actionLabel}
        </Link>
      </div>
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-[0.95rem] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function FilterChip({ active, onClick, children, count, icon, tile }: {
  active: boolean
  onClick: () => void
  children: ReactNode
  count?: number
  /** Optional icon shown in a small tinted tile. */
  icon?: ReactNode
  /** Tile colors when not active, e.g. "bg-blue-50 text-blue-700". */
  tile?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl text-sm font-semibold transition',
        icon ? 'pl-1.5 pr-3' : 'px-4',
        active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
          : 'bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:-translate-y-px hover:text-slate-900 hover:shadow-md hover:ring-slate-300'
      )}
    >
      {icon && <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl [&_svg]:h-4 [&_svg]:w-4', active ? 'bg-white/20 text-white' : tile ?? 'bg-slate-100 text-slate-600')}>{icon}</span>}
      {children}
      {typeof count === 'number' && <span className={cn('min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums', active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>}
    </button>
  )
}

/** Round checkbox in a card corner. Always visible when selecting; otherwise on hover. */
export function SelectToggle({ selected, selecting, onToggle, className }: { selected: boolean; selecting: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={selected ? 'Deselect' : 'Select'}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm transition-all focus-visible:opacity-100',
        selected ? 'border-blue-600 bg-blue-600 text-white opacity-100' : 'border-white bg-white/90 text-transparent hover:border-blue-400',
        !selected && !selecting && 'opacity-0 group-hover:opacity-100',
        className
      )}
    >
      <Check className="h-4 w-4" />
    </button>
  )
}

export function relativeDate(iso: string): string {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: then.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export function CardSkeletonGrid({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white', height)}>
          <div className="h-24 animate-pulse bg-slate-100" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

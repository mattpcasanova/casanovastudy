"use client"

// Building blocks shared by the Outline and Summary viewers.

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadProgress, saveProgress, parseProgressKey } from '@/lib/progress'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { eyebrow, tierStyles, type Tier } from '@/lib/formats/design'
import { normalizeGuideMarkdown } from '@/lib/formats/normalize'
import { parseGuideStructure, groupDisplayTitle, splitNumbering, type GuideStructure } from '@/lib/formats/structure'

export function useGuideStructure(content: string): GuideStructure {
  return useMemo(() => parseGuideStructure(normalizeGuideMarkdown(content)), [content])
}

export const TIER_BLURB: Record<Tier, string> = {
  essential: 'Know these cold. They carry the most exam weight.',
  important: 'Applications and examples that build on the essentials.',
  supporting: 'Background and extra detail for a complete picture.',
}

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const t = tierStyles[tier]
  return (
    <span className={cn(eyebrow, 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1', t.chip, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
      {t.label}
    </span>
  )
}

export interface TocEntry {
  id: string
  label: string
  level: 0 | 1
  tier?: Tier
  done?: boolean
}

export function buildToc(s: GuideStructure, opts: { objectivesId?: string } = {}): TocEntry[] {
  const out: TocEntry[] = []
  if (s.objectives && opts.objectivesId) out.push({ id: opts.objectivesId, label: 'Learning objectives', level: 0 })
  for (const b of s.blocks) {
    if (b.type === 'group') {
      out.push({ id: b.id, label: groupDisplayTitle(b.title) || tierStyles[b.tier].label, level: 0, tier: b.tier })
      for (const c of b.cards) out.push({ id: c.id, label: splitNumbering(c.title).text, level: 1 })
    } else {
      out.push({ id: b.card.id, label: splitNumbering(b.card.title).text, level: 0 })
    }
  }
  return out
}

// Highlights the last entry whose section top has scrolled past the reading line.
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  const key = ids.join('|')
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      let current: string | null = ids[0] ?? null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) current = id
      }
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return active
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const y = el.getBoundingClientRect().top + window.scrollY - 96 // clear the sticky progress bar
  window.scrollTo({ top: y, behavior: 'smooth' })
}

export function TableOfContents({ entries, active, title = 'On this page' }: { entries: TocEntry[]; active: string | null; title?: string }) {
  if (entries.length < 3) return null
  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className={cn(eyebrow, 'mb-3 text-slate-400')}>{title}</p>
      <ul className="space-y-0.5 border-l border-slate-200">
        {entries.map((e) => {
          const isActive = e.id === active
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => scrollToId(e.id)}
                className={cn(
                  '-ml-px flex w-full items-center gap-2 border-l-2 py-1 pr-2 text-left leading-snug transition-colors',
                  e.level === 0 ? 'pl-3 font-medium' : 'pl-6 text-[0.82rem]',
                  isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                )}
              >
                {e.tier && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tierStyles[e.tier].dot)} />}
                <span className="line-clamp-2 flex-1">{e.label}</span>
                {e.done && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Per-guide progress (outline checkmarks, plan "studied" units). The browser
// copy renders instantly; keys shaped "cs:<kind>:<guideId>" also sync to the
// signed-in account (lib/progress.ts), which wins once it exists — so progress
// follows the student across devices. Existing browser-only progress is
// uploaded the first time.
export function usePersistentSet(key: string | undefined): [Set<string>, (id: string) => void, () => void] {
  const [set, setSet] = useState<Set<string>>(new Set())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sync = key ? parseProgressKey(key) : null

  useEffect(() => {
    if (!key) return
    let local = new Set<string>()
    try {
      const raw = localStorage.getItem(key)
      if (raw) local = new Set(JSON.parse(raw))
    } catch {}
    setSet(local)

    const target = parseProgressKey(key)
    if (!target) return
    let cancelled = false
    loadProgress<{ items?: string[] }>(target.studyGuideId, target.kind).then((remote) => {
      if (cancelled) return
      if (remote && Array.isArray(remote.items)) {
        const next = new Set(remote.items)
        setSet(next)
        try { localStorage.setItem(key, JSON.stringify([...next])) } catch {}
      } else if (local.size > 0) {
        void saveProgress(target.studyGuideId, target.kind, { items: [...local] })
      }
    })
    return () => { cancelled = true }
  }, [key])

  const persist = (next: Set<string>) => {
    if (!key) return
    try { localStorage.setItem(key, JSON.stringify([...next])) } catch {}
    if (sync) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      const { studyGuideId, kind } = sync
      saveTimer.current = setTimeout(() => { void saveProgress(studyGuideId, kind, { items: [...next] }) }, 400)
    }
  }
  const toggle = (id: string) => {
    setSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persist(next)
      return next
    })
  }
  const clear = () => {
    setSet(new Set())
    persist(new Set())
  }
  return [set, toggle, clear]
}

"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Brain, ChevronRight } from 'lucide-react'
import type { StudyGuideRecord } from '@/lib/supabase'
import { loadProgress } from '@/lib/progress'
import { summarize, type LearnState } from '@/lib/learn/scheduler'
import { learnItemsFor, LEARN_FORMATS } from './items'

// "Learn this guide" strip on the viewer, with today's due count.
export default function LearnCallout({ guide }: { guide: StudyGuideRecord }) {
  const supported = (LEARN_FORMATS as readonly string[]).includes(guide.format)
  const ids = useMemo(() => (supported ? learnItemsFor(guide).map((i) => i.id) : []), [guide, supported])
  const [state, setState] = useState<LearnState | null>(null)

  useEffect(() => {
    if (!ids.length) return
    try { setState(JSON.parse(localStorage.getItem(`cs:learn:${guide.id}`) || '{}')) } catch { setState({}) }
    let cancelled = false
    loadProgress<{ items?: LearnState }>(guide.id, 'learn').then((remote) => {
      if (!cancelled && remote?.items) setState(remote.items)
    })
    return () => { cancelled = true }
  }, [guide.id, ids.length])

  if (!ids.length) return null
  const s = state ? summarize(ids, state) : null
  const started = s && s.fresh < s.total

  let detail = `${ids.length} items · spaced repetition`
  if (s && started) {
    detail = s.due > 0
      ? `${s.due} review${s.due === 1 ? '' : 's'} due · ${s.mastered}/${s.total} mastered`
      : s.fresh > 0 ? `${s.fresh} new to learn · ${s.mastered}/${s.total} mastered` : `All caught up · ${s.mastered}/${s.total} mastered`
  }

  return (
    <Link
      href={`/study-guide/${guide.id}/learn`}
      className="group mb-6 flex items-center gap-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white px-5 py-4 shadow-sm transition hover:border-violet-300 hover:shadow-md print:hidden"
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
        <Brain className="h-6 w-6" />
        {s && s.due > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.7rem] font-bold text-white ring-2 ring-white">{s.due}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{started ? 'Continue learning' : 'Learn this guide'}</span>
        <span className="block truncate text-sm text-slate-600">{detail}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-violet-500 transition group-hover:translate-x-0.5" />
    </Link>
  )
}

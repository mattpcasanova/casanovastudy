'use client'

// Shared by the quiz, practice (and Learn) and adaptive players' multiple-choice
// options:
// - Cross out: a button beside each option strikes it through, the way students
//   rule options out on paper and on the digital SAT. Run state only.
// - Lock in: picking an option no longer checks it at once (students tapped the
//   wrong one by accident and were stuck with it). A pick is shown as selected;
//   "Check answer", or tapping the same option again, locks it in.

import { useCallback, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Options crossed out, per question (kept when the student moves back to one); `key` = the question on screen. */
export function useCrossOut(key: string) {
  const [byKey, setByKey] = useState<Record<string, number[]>>({})
  const list = byKey[key]
  const crossed = useMemo(() => new Set(list ?? []), [list])
  const toggle = useCallback((i: number) => {
    setByKey((m) => {
      const cur = m[key] ?? []
      return { ...m, [key]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] }
    })
  }, [key])
  const uncross = useCallback((i: number) => {
    setByKey((m) => (m[key]?.includes(i) ? { ...m, [key]: m[key].filter((x) => x !== i) } : m))
  }, [key])
  const clearAll = useCallback(() => setByKey({}), [])
  return { crossed, toggle, uncross, clearAll }
}

/** The strike-through toggle beside an option (sits outside the option button). */
export function CrossOutButton({ letter, crossed, onToggle, disabled }: { letter: string; crossed: boolean; onToggle: () => void; disabled?: boolean }) {
  if (disabled) return <span className="w-11 shrink-0" aria-hidden />
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={crossed}
      aria-label={crossed ? `Bring back option ${letter}` : `Cross out option ${letter}`}
      title={crossed ? 'Bring it back' : 'Cross it out'}
      className={cn(
        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition',
        crossed ? 'border-slate-400 bg-slate-100 text-slate-500' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-600'
      )}
    >
      {crossed ? <span className="text-[0.7rem] font-semibold">Undo</span> : <span className="relative">{letter}<span className="absolute left-[-3px] right-[-3px] top-1/2 h-[2px] -translate-y-1/2 bg-current" /></span>}
    </button>
  )
}

/** Classes for an option that's been crossed out. */
export const crossedClass = 'border-dashed bg-slate-50 [&_.option-text]:text-slate-500 [&_.option-text]:line-through [&_.option-text]:decoration-2 [&_.option-text]:decoration-slate-500'

/** "Check answer" under the options once something is picked and not yet locked in. */
export function LockInButton({ show, onClick, tone = 'purple', label = 'Check answer' }: { show: boolean; onClick: () => void; tone?: 'purple' | 'orange' | 'sky'; label?: string }) {
  if (!show) return null
  const color = tone === 'orange' ? 'bg-orange-700 hover:bg-orange-800' : tone === 'sky' ? 'bg-sky-700 hover:bg-sky-800' : 'bg-purple-600 hover:bg-purple-700'
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button type="button" onClick={onClick} className={cn('h-11 px-5 text-white', color)}>
        <Check className="mr-1.5 h-4 w-4" /> {label}
      </Button>
      <span className="text-xs text-slate-500">or tap your choice again</span>
    </div>
  )
}

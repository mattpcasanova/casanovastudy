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
import { usePlayerText } from '@/components/reading/reading-provider'

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
  const t = usePlayerText()
  if (disabled) return <span className="w-11 shrink-0" aria-hidden />
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={crossed}
      aria-label={crossed ? `Bring back option ${letter}` : `Cross out option ${letter}`}
      title={crossed ? t.bringBack : t.crossOut}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm transition',
        crossed
          ? 'border-slate-300 bg-slate-100 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-200'
          : 'border-slate-200 bg-white font-bold text-slate-400 line-through decoration-slate-400 decoration-2 hover:border-slate-400 hover:text-slate-600 hover:decoration-slate-600'
      )}
    >
      {crossed ? 'Undo' : letter}
    </button>
  )
}

/** Classes for an option that's been crossed out. */
export const crossedClass = 'border-dashed bg-slate-50 [&_.option-text]:text-slate-500 [&_.option-text]:line-through [&_.option-text]:decoration-2 [&_.option-text]:decoration-slate-500'

/** "Check answer" once something is picked and not yet locked in (full width on phones). */
export function LockInButton({ show, onClick, tone = 'purple', label }: { show: boolean; onClick: () => void; tone?: 'purple' | 'orange' | 'sky'; label?: string }) {
  const t = usePlayerText()
  if (!show) return null
  const color = tone === 'orange' ? 'bg-orange-700 hover:bg-orange-800' : tone === 'sky' ? 'bg-sky-700 hover:bg-sky-800' : 'bg-purple-600 hover:bg-purple-700'
  return (
    <Button type="button" onClick={onClick} title="Tapping your choice again also locks it in" className={cn('h-11 w-full px-5 text-white sm:w-auto', color)}>
      <Check className="mr-1.5 h-4 w-4" /> {label ?? t.checkAnswer}
    </Button>
  )
}

/**
 * The row under a question's options: the hint on the left, the lock-in button
 * on the right (on phones the button comes first, full width). One row with one
 * top margin, so the button never floats between the options and the hint.
 */
export function ChoiceActions({ hint, check, className }: { hint?: React.ReactNode; check?: React.ReactNode; className?: string }) {
  if (!hint && !check) return null
  return (
    <div className={cn('mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      {hint ? <div className="min-w-0 sm:order-1 sm:flex-1">{hint}</div> : <span className="hidden sm:block sm:order-1 sm:flex-1" />}
      {check && <div className="sm:order-2 sm:shrink-0">{check}</div>}
    </div>
  )
}

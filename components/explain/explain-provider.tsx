"use client"

// "Explain" for study guides: ask the AI about any part of a guide.
//  - Highlight text inside the guide: on desktop an "Explain" pill appears
//    next to the selection; on phones (where the OS owns the selection menu)
//    the always-visible dock button turns into "Explain selection".
//  - The dock's "Ask AI" button opens the panel to type a question.
//  - Quiz/practice/Learn feedback boxes show an ExplainButton ("Why?").
// Answers stream from /api/explain into a side panel (desktop) or bottom
// sheet (phone), with quick follow-ups. The thread lives in memory only.
// The dock also hosts the Desmos calculator button when that is enabled.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUp, Calculator, Camera, Loader2, RotateCcw, MessageCircleQuestion, X } from 'lucide-react'
import { PHOTO_ACCEPT, photoToDataUrl } from './tutor-help'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'
import { signInPath } from '@/lib/sign-in-path'
import { StudyMarkdown } from '@/components/formats/study-markdown'
import { useDesmos, useDesmosSheet } from '@/components/desmos/desmos-context'
import { DesmosStepsStreaming } from '@/components/formats/desmos-steps'
import { formatReset, usePlan } from '@/components/plan/plan-provider'
import { isPlanBlock } from '@/lib/plan-rules'
import { PLANS_ENABLED } from '@/lib/features'

import { ExplainContext, useExplain, type ExplainApi, type ExplainRequest } from './explain-context'

export { useExplain, type ExplainRequest }

interface Turn { role: 'user' | 'assistant'; content: string; label?: string; image?: string }

const FOLLOW_UPS: ExplainRequest[] = [
  { label: 'Simpler', prompt: 'Explain that more simply.' },
  { label: 'Give an example', prompt: 'Give me one concrete example.' },
  { label: 'Show the steps', prompt: 'Show the steps.' },
]

const TIP_KEY = 'cs:hint:explain'

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)

/** The text around a selection: the nearest block with enough substance, capped. */
function contextAround(range: Range, root: HTMLElement, selected: string): string {
  let el: Element | null = range.commonAncestorContainer.nodeType === 1
    ? (range.commonAncestorContainer as Element)
    : range.commonAncestorContainer.parentElement
  while (el && el !== root && el.parentElement && (el.textContent?.length ?? 0) < 700) el = el.parentElement
  const text = (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= 2500) return text
  const at = Math.max(0, text.indexOf(selected.slice(0, 40)))
  return text.slice(Math.max(0, at - 1200), at + 1300)
}

function useFinePointer(): boolean {
  const [fine, setFine] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    setFine(mq.matches)
    const on = () => setFine(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return fine
}

export function ExplainProvider({ guideId, children }: { guideId: string; children: ReactNode }) {
  const { user } = useAuth()
  const desmos = useDesmos()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  // Free plan: explanations left today (from the route's X-Usage-Remaining header).
  const [freeLeft, setFreeLeft] = useState<{ left: number; limit: number } | null>(null)
  const [limited, setLimited] = useState(false)
  const { openPremium } = usePlan()
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ text: string; context: string; rect: DOMRect } | null>(null)
  const finePointer = useFinePointer()
  // One-time tip so students learn they can highlight text (remembered per browser).
  const [showTip, setShowTip] = useState(false)
  useEffect(() => {
    try { if (!localStorage.getItem(TIP_KEY)) setShowTip(true) } catch { /* storage unavailable */ }
  }, [])
  const dismissTip = useCallback(() => {
    setShowTip(false)
    try { localStorage.setItem(TIP_KEY, '1') } catch { /* storage unavailable */ }
  }, [])
  const turnsRef = useRef<Turn[]>([])
  turnsRef.current = turns

  // Track highlighted text inside the guide.
  useEffect(() => {
    let frame = 0
    const read = () => {
      const sel = window.getSelection()
      const root = rootRef.current
      if (!sel || sel.isCollapsed || !sel.rangeCount || !root) { setSelection(null); return }
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) { setSelection(null); return }
      const text = sel.toString().replace(/\s+/g, ' ').trim()
      if (text.length < 2 || text.length > 800) { setSelection(null); return }
      setSelection({ text, context: contextAround(range, root, text), rect: range.getBoundingClientRect() })
    }
    const onChange = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read) }
    const onScroll = () => setSelection((s) => (s ? { ...s, rect: window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0).getBoundingClientRect() : s.rect } : s))
    document.addEventListener('selectionchange', onChange)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { document.removeEventListener('selectionchange', onChange); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])

  const send = useCallback(async (req: ExplainRequest) => {
    setOpen(true)
    dismissTip()
    setError(null)
    if (!user || busy) return
    const history: Turn[] = [...turnsRef.current, { role: 'user', content: req.prompt, label: req.label, ...(req.image ? { image: req.image } : {}) }]
    setTurns([...history, { role: 'assistant', content: '' }])
    setBusy(true)
    try {
      const res = await authFetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyGuideId: guideId, turns: history.map(({ role, content, image }) => ({ role, content, ...(image ? { image } : {}) })) }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        if (isPlanBlock(data)) {
          const reset = formatReset(data.resetsAt)
          setLimited(true)
          throw new Error(`${data.error}${reset ? ` More unlock at ${reset}.` : ''}`)
        }
        throw new Error(data.error || 'Could not get an explanation. Please try again.')
      }
      setLimited(false)
      const left = Number(res.headers.get('X-Usage-Remaining'))
      const limit = Number(res.headers.get('X-Usage-Limit'))
      setFreeLeft(res.headers.get('X-Plan') === 'free' && Number.isFinite(left) && limit ? { left, limit } : null)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setTurns([...history, { role: 'assistant', content: text }])
      }
    } catch (e) {
      setTurns(history) // keep the question, drop the empty answer
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }, [user, busy, guideId, dismissTip])

  const explainSelection = useCallback(() => {
    if (!selection) return
    const { text, context } = selection
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    void send({
      label: `“${clip(text, 140)}”`,
      prompt: `Explain this part of my study guide: "${text}"\n\nThe guide around it:\n"""\n${context}\n"""`,
    })
  }, [selection, send])

  const api = useMemo<ExplainApi>(() => ({ ask: (req) => void send(req) }), [send])

  // Desktop: pill above (or below) the highlighted text.
  const pill = selection && finePointer && !busy ? (() => {
    const { rect } = selection
    const top = rect.top > 70 ? rect.top - 46 : rect.bottom + 8
    const left = Math.min(Math.max(rect.left + rect.width / 2, 70), window.innerWidth - 70)
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // keep the selection while clicking
        onClick={explainSelection}
        style={{ top, left }}
        className="fixed z-50 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 transition hover:bg-blue-700 print:hidden"
      >
        <MessageCircleQuestion className="h-4 w-4 text-sky-300" /> Explain
      </button>
    )
  })() : null

  const touchSelection = selection && !finePointer

  return (
    <ExplainContext.Provider value={api}>
      <div ref={rootRef}>{children}</div>
      {/* Room to scroll the last answer/Next button clear of the floating dock. */}
      <div aria-hidden className={cn('print:hidden', desmos ? 'h-28' : 'h-16', 'sm:h-12')} />
      {pill}

      {/* Dock: always visible, bottom-left (the guide's menu is bottom-right). */}
      {!(open && !finePointer) && (
        <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2 sm:bottom-6 sm:left-6 print:hidden">
          {desmos && (
            <button
              type="button"
              onClick={desmos.open}
              onPointerEnter={desmos.preload}
              onFocus={desmos.preload}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition hover:border-blue-300 hover:text-blue-700"
            >
              <Calculator className="h-4 w-4 text-blue-600" /> Calculator
            </button>
          )}
          {showTip && !touchSelection && (
            <div role="note" className="relative mb-1 w-64 animate-fade-up rounded-xl bg-slate-900 p-3.5 text-sm text-white shadow-xl">
              <p className="font-semibold">Stuck on something?</p>
              <p className="mt-1 text-white/80">
                {finePointer
                  ? 'Highlight any text in this guide, then click Explain. You can also ask about any graph or model with its Explain button, or click Ask AI to type a question.'
                  : 'Press and hold any text to select it, then tap Explain selection. Graphs and models have their own Explain button, and Ask AI lets you type a question.'}
              </p>
              <button type="button" onClick={dismissTip} className="mt-2.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25">Got it</button>
              <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-slate-900" />
            </div>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={touchSelection ? explainSelection : () => { dismissTip(); setOpen((o) => !o) }}
            title={finePointer ? 'Ask a question, or highlight any text to have it explained' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition',
              touchSelection
                ? 'bg-slate-900 text-white ring-4 ring-blue-500/30'
                : 'border border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:text-blue-700',
              showTip && !touchSelection && 'ring-4 ring-blue-400/40 motion-safe:animate-pulse',
            )}
          >
            <MessageCircleQuestion className={cn('h-4 w-4', touchSelection ? 'text-sky-300' : 'text-blue-600')} />
            {touchSelection ? 'Explain selection' : 'Ask AI'}
          </button>
        </div>
      )}

      {open && (
        <ExplainPanel
          signedIn={!!user}
          turns={turns}
          busy={busy}
          error={error}
          onSend={(req) => { if (req === DESMOS_FOLLOW_UP) desmos?.preload(); void send(req) }}
          onClear={() => { setTurns([]); setError(null) }}
          onClose={() => setOpen(false)}
          desmosFollowUp={!!desmos?.graphing}
          freeLeft={freeLeft}
          limited={limited}
          onPremium={() => openPremium()}
        />
      )}
    </ExplainContext.Provider>
  )
}

const DESMOS_FOLLOW_UP: ExplainRequest = { label: 'Show me in Desmos', prompt: 'Solve it in Desmos: show me step by step how to do this with the Desmos graphing calculator.' }

function ExplainPanel({ signedIn, turns, busy, error, onSend, onClear, onClose, desmosFollowUp, freeLeft, limited, onPremium }: {
  signedIn: boolean; turns: Turn[]; busy: boolean; error: string | null
  onSend: (req: ExplainRequest) => void; onClear: () => void; onClose: () => void
  desmosFollowUp: boolean
  freeLeft: { left: number; limit: number } | null
  limited: boolean
  onPremium: () => void
}) {
  const [draft, setDraft] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const attach = async (file: File | undefined) => {
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try { setPhoto(await photoToDataUrl(file)) } catch { setPhotoError("That photo couldn't be opened. Try a JPG or PNG.") }
    finally { setPhotoBusy(false); if (photoRef.current) photoRef.current.value = '' }
  }
  // Phones: with the calculator sheet open, take the space above it instead of sliding underneath.
  const calcSheetVh = useDesmosSheet()
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [turns])
  const submit = () => {
    const q = draft.trim()
    if ((!q && !photo) || busy) return
    setDraft('')
    if (photo) {
      const text = q || 'Here is a photo of my work. Where did I go wrong?'
      setPhoto(null)
      onSend({ label: q || 'Check my work', prompt: text, image: photo })
      return
    }
    onSend({ label: q, prompt: q })
  }
  const last = turns[turns.length - 1]

  return (
    <aside
      className={cn(
        'fixed inset-x-0 z-50 flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl print:hidden',
        calcSheetVh != null ? 'top-0 rounded-b-2xl' : 'bottom-0 h-[75vh] rounded-t-2xl',
        'sm:inset-x-auto sm:bottom-6 sm:right-4 sm:top-20 sm:h-auto sm:w-[420px] sm:rounded-2xl',
      )}
      style={calcSheetVh != null ? { bottom: `calc(${calcSheetVh}vh + 6px)` } : undefined}
      aria-label="Explain"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><MessageCircleQuestion className="h-4 w-4" /></span>
        <span className="font-semibold text-slate-900">Explain</span>
        <div className="ml-auto flex items-center gap-1">
          {turns.length > 0 && (
            <button type="button" onClick={onClear} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Start over">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {!signedIn ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
            <p className="font-semibold text-slate-900">Sign in to ask for explanations</p>
            <p className="mt-1">It&apos;s free. Highlight anything in a guide and get it explained in plain words.</p>
            <Link href={signInPath()} className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Sign in</Link>
          </div>
        ) : turns.length === 0 ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-900">Highlight any text</span> in your guide, then tap <span className="font-semibold text-slate-900">Explain</span>.</p>
            <p>Every graph and model has its own <span className="font-semibold text-slate-900">Explain</span> button in its corner.</p>
            <p>Or ask a question about this guide below. Tap the camera to send a photo of your work and see where it went wrong.</p>
          </div>
        ) : (
          turns.map((t, i) => (t.role === 'user' ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-blue-50 px-3.5 py-2.5 text-sm text-blue-950 ring-1 ring-inset ring-blue-100">
              {t.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.image} alt="Your photo" className="mb-2 max-h-40 rounded-lg object-contain ring-1 ring-blue-100" />
              )}
              {t.label ?? t.content}
            </div>
          ) : (
            <div key={i} className="text-[0.95rem]">
              {t.content ? (
                <DesmosStepsStreaming.Provider value={busy && i === turns.length - 1}>
                  <StudyMarkdown content={t.content} compact />
                </DesmosStepsStreaming.Provider>
              ) : <span className="inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</span>}
            </div>
          )))
        )}
        {error && (
          limited ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
              {error}
              {PLANS_ENABLED && <>{' '}<button type="button" onClick={onPremium} className="font-semibold text-blue-700 hover:underline">Premium or a code</button></>}
            </p>
          ) : <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {freeLeft && !limited && freeLeft.left <= 2 && (
          <p className="text-center text-xs text-slate-500">{freeLeft.left === 0 ? 'That was your last free explanation for today.' : `${freeLeft.left} of ${freeLeft.limit} free explanations left today.`}</p>
        )}
        {signedIn && !busy && last?.role === 'assistant' && last.content && (
          <div className="flex flex-wrap gap-2">
            {[...FOLLOW_UPS, ...(desmosFollowUp ? [DESMOS_FOLLOW_UP] : [])].map((f) => (
              <button key={f.label} type="button" onClick={() => onSend(f)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700">
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {signedIn && (
        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          className="border-t border-slate-200 p-3"
        >
          {(photo || photoBusy || photoError) && (
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
              {photoBusy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Getting your photo ready…</>
                : photoError ? <span className="text-rose-600">{photoError}</span>
                  : photo && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt="Photo to send" className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200" />
                      <span>Photo attached. Ask about it, or just send.</span>
                      <button type="button" onClick={() => setPhoto(null)} className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Remove photo"><X className="h-3.5 w-3.5" /></button>
                    </>
                  )}
            </div>
          )}
          <div className="flex items-end gap-2">
          <input ref={photoRef} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={(e) => void attach(e.target.files?.[0])} />
          <button type="button" onClick={() => photoRef.current?.click()} disabled={busy || photoBusy} title="Add a photo of your work" aria-label="Add a photo of your work" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-40">
            <Camera className="h-4 w-4" />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            rows={1}
            maxLength={1500}
            placeholder={photo ? 'What should I check? (optional)' : turns.length ? 'Ask a follow-up…' : 'Ask about this guide…'}
            className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button type="submit" disabled={(!draft.trim() && !photo) || busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40" aria-label="Send">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
          </div>
        </form>
      )}
    </aside>
  )
}

/** "Solve it in Desmos" for math feedback boxes; only when the guide has the graphing calculator. */
export function DesmosHelpButton({ build, className }: { build: () => ExplainRequest; className?: string }) {
  const explain = useExplain()
  const desmos = useDesmos()
  if (!explain || !desmos?.graphing) return null
  return (
    <button
      type="button"
      onClick={() => { desmos.preload(); explain.ask(build()) }}
      className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 print:hidden', className)}
    >
      <Calculator className="h-3.5 w-3.5 text-blue-600" /> Solve it in Desmos
    </button>
  )
}

/** "Why?" button for feedback boxes. Renders nothing outside an ExplainProvider. */
export function ExplainButton({ build, className, children = 'Explain this' }: { build: () => ExplainRequest; className?: string; children?: ReactNode }) {
  const explain = useExplain()
  if (!explain) return null
  return (
    <button
      type="button"
      onClick={() => explain.ask(build())}
      className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 print:hidden', className)}
    >
      <MessageCircleQuestion className="h-3.5 w-3.5" /> {children}
    </button>
  )
}

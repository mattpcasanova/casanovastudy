"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCw, Trash2, X, ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PaperPage } from "@/lib/grading/paper-pages"
import { BASIC_ANNOTATIONS, EXAM_BOARD_ANNOTATIONS, EXAM_BOARD_MARKS, type Annotation, type PaperStamp } from "@/lib/grading/mark-points"

// The student's paper beside the report, so the teacher can check an answer
// the grader flagged ("Check this") without the stack of papers in front of
// them. On a laptop it's a sticky column next to the report; on a phone it
// covers the screen. One page at a time with arrows (keyboard too), a strip
// of thumbnails to jump, zoom and rotate (phone photos come in sideways).

const ZOOMS = [1, 1.5, 2, 3]

const STAMP_TONE = { earned: "text-emerald-700 ring-emerald-600", lost: "text-rose-700 ring-rose-600", partial: "text-amber-800 ring-amber-600", score: "text-blue-800 ring-blue-700", note: "text-slate-800 ring-slate-500" } as const

/** A mark as it sits on the paper: examiner's pen, a little see-through so the work under it stays readable. */
export function StampLabel({ stamp, className, size = "page" }: { stamp: Pick<PaperStamp, "text" | "tone">; className?: string; /** On the page, or as a button in the palette (bigger). */ size?: "page" | "palette" }) {
  // A sentence the teacher wrote reads as handwriting in the margin; a code stays a stamp.
  const words = stamp.text.length > 12
  const symbol = /^[✓✗½^?]$/.test(stamp.text)
  return (
    <span className={cn("inline-block rounded-md bg-white/90 ring-2 [print-color-adjust:exact]",
      words ? "max-w-[16rem] whitespace-normal px-2 py-1 text-left text-xs font-semibold leading-snug"
        : size === "palette" ? cn("whitespace-nowrap px-2.5 py-1.5 font-mono font-bold leading-none", symbol ? "text-xl" : "text-base")
          : cn("whitespace-nowrap px-1.5 py-0.5 font-mono font-bold leading-none", symbol ? "text-base" : "text-sm"),
      STAMP_TONE[stamp.tone], className)}>
      {stamp.text}
    </span>
  )
}

const MARK_WORDS: Record<string, string> = { M1: "method", A1: "accuracy", B1: "independent", DM1: "dependent", "✓": "right", "✗": "wrong", "½": "half" }

/** What the teacher is putting on the paper right now. */
export interface PlacingStamp {
  text: string
  question: string
  /** It already sits on the paper (she picked it up to move it). */
  placed: boolean
}

export function PaperViewer({ pages, page, onPage, studentName, onClose, className, stamps = [], placing = null, onPlace, onPickStamp, onRemovePlacing, onCancelPlacing, palette = null }: {
  pages: PaperPage[]
  /** 0-based page shown. */
  page: number
  onPage: (page: number) => void
  studentName: string
  onClose: () => void
  className?: string
  /** Marks the teacher put on the paper (all pages; page is 1-based). */
  stamps?: PaperStamp[]
  /** A mark waiting to be put down: the next click on the page places it. */
  placing?: PlacingStamp | null
  onPlace?: (place: { page: number; x: number; y: number }) => void
  /** A mark on the paper was clicked (to move it or take it off). */
  onPickStamp?: (stamp: PaperStamp) => void
  onRemovePlacing?: () => void
  onCancelPlacing?: () => void
  /** Notes the teacher can put on the page (ticks, "ft", a few words), for the question named. */
  palette?: { question: string; examBoard: boolean; onPick: (a: Annotation) => void } | null
}) {
  const [noteText, setNoteText] = useState("")
  // The notes row is long on a Cambridge paper; folded until wanted.
  const [notesOpen, setNotesOpen] = useState(false)
  const [zoomIndex, setZoomIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const count = pages.length
  const current = Math.min(Math.max(page, 0), Math.max(count - 1, 0))
  const zoom = ZOOMS[zoomIndex]
  const sideways = rotation % 180 !== 0
  // The image's own width / height, known once it loads (a letter page until then).
  const [ratio, setRatio] = useState<number | null>(null)
  const naturalRatio = ratio ?? 0.77
  const visualRatio = sideways ? 1 / naturalRatio : naturalRatio

  const go = useCallback((next: number) => {
    if (next < 0 || next >= count) return
    onPage(next)
    scrollRef.current?.scrollTo({ top: 0, left: 0 })
  }, [count, onPage])

  // Arrow keys page through while nothing is being typed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1) }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1) }
      else if (e.key === "Escape") { if (placing && onCancelPlacing) { e.stopImmediatePropagation(); onCancelPlacing() } else onClose() }
    }
    // Capture, so Esc puts a mark down before it ends marking.
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [current, go, onClose, placing, onCancelPlacing])

  if (!count) return null
  const shown = pages[current]

  return (
    <section
      aria-label={`${studentName}'s paper`}
      className={cn(
        "flex flex-col overflow-hidden bg-slate-900 text-white print:hidden",
        // Phone: full screen. Laptop: a sticky column next to the report.
        "fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:h-[calc(100vh-2rem)] lg:rounded-2xl lg:shadow-2xl lg:shadow-blue-900/20 lg:ring-1 lg:ring-slate-200",
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{studentName}&apos;s paper</p>
          <p className="text-xs text-slate-300" aria-live="polite">Page {current + 1} of {count}</p>
        </div>
        <button type="button" onClick={() => setZoomIndex((z) => Math.max(0, z - 1))} disabled={zoomIndex === 0} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40" aria-label="Zoom out"><ZoomOut className="h-5 w-5" /></button>
        <button type="button" onClick={() => setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoomIndex === ZOOMS.length - 1} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40" aria-label="Zoom in"><ZoomIn className="h-5 w-5" /></button>
        <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Rotate page"><RotateCw className="h-5 w-5" /></button>
        <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close the paper"><X className="h-5 w-5" /></button>
      </header>

      {placing && onPlace && (
        <div className="flex flex-wrap items-center gap-2 bg-blue-700 px-3 py-2 text-sm" role="status">
          <StampLabel stamp={{ text: placing.text, tone: "score" }} />
          <span className="min-w-0 flex-1">{placing.placed ? "Click where it should go instead." : `Click the paper to put this on question ${placing.question}.`}</span>
          {placing.placed && onRemovePlacing && (
            <button type="button" onClick={onRemovePlacing} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3 font-semibold hover:bg-white/25"><Trash2 className="h-4 w-4" />Take it off</button>
          )}
          {onCancelPlacing && <button type="button" onClick={onCancelPlacing} className="inline-flex h-9 items-center rounded-lg bg-white/15 px-3 font-semibold hover:bg-white/25">{placing.placed ? "Leave it" : "Skip"}</button>}
        </div>
      )}
      {palette && !placing && (
        <div className="space-y-2.5 border-b border-white/10 px-3 py-3 text-xs text-slate-200">
          <p className="text-sm text-white">Marking question <span className="font-semibold">{palette.question}</span>. Pick a mark or a note, then click the spot on the paper.</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 w-10 font-semibold uppercase tracking-wide text-slate-400">Marks</span>
            {[...(palette.examBoard ? EXAM_BOARD_MARKS : []), ...BASIC_ANNOTATIONS.slice(0, 3)].map((a) => (
              <button key={a.text} type="button" title={a.title} onClick={() => palette.onPick(a)} className="inline-flex flex-col items-center gap-0.5 rounded-lg p-0.5 ring-2 ring-transparent hover:ring-sky-400" aria-label={`${a.title} (${a.text})`}>
                <StampLabel stamp={a} size="palette" />
                {MARK_WORDS[a.text] && <span className="text-[11px] leading-none text-slate-300">{MARK_WORDS[a.text]}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setNotesOpen((o) => !o)} aria-expanded={notesOpen} className="mr-1 inline-flex h-9 items-center gap-1 rounded-md px-1.5 font-semibold uppercase tracking-wide text-slate-300 hover:bg-white/10 hover:text-white">
              Notes <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", notesOpen && "rotate-90")} />
            </button>
            {(notesOpen ? [...(palette.examBoard ? EXAM_BOARD_ANNOTATIONS : []), ...BASIC_ANNOTATIONS.slice(3)] : BASIC_ANNOTATIONS.slice(3)).map((a) => (
              <button key={a.text} type="button" title={a.title} onClick={() => palette.onPick(a)} className="rounded-lg p-0.5 ring-2 ring-transparent hover:ring-sky-400" aria-label={`${a.title} (${a.text})`}>
                <StampLabel stamp={a} size="palette" />
              </button>
            ))}
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => { e.preventDefault(); const text = noteText.trim().slice(0, 300); if (text) { palette.onPick({ text, tone: "note", title: "Note" }); setNoteText("") } }}
            >
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Your own words" aria-label="A note in your own words" className="h-9 w-40 rounded-md bg-white/10 px-2.5 text-sm text-white placeholder:text-slate-400 focus:bg-white/20 focus:outline-none" />
              <button type="submit" disabled={!noteText.trim()} className="h-9 rounded-md bg-white/15 px-3 text-sm font-semibold hover:bg-white/25 disabled:opacity-40">Place</button>
            </form>
          </div>
          {palette.examBoard && <p className="text-slate-400">M1, A1, B1 and DM1 give this question's marks (the sheet updates); M0, A0 and B0 take them back. {notesOpen ? "Hover a note for what it means." : "Open Notes for ft, cao, oe and the rest."}</p>}
        </div>
      )}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full items-start justify-center p-2">
          {/* A box the size the page takes up once rotated (its own aspect
              ratio, turned on its side when needed); the image sits in it
              rotated about the centre, so a sideways phone photo fills the
              panel's height instead of its width. */}
          <div
            style={{
              aspectRatio: String(visualRatio),
              width: zoom === 1 ? `min(100%, calc((100vh - 11rem) * ${visualRatio}))` : `${zoom * 100}%`,
              containerType: "size",
            }}
            className="relative shrink-0 overflow-hidden rounded bg-white shadow-lg"
            onDoubleClick={() => { if (!placing) setZoomIndex((z) => (z === 0 ? 2 : 0)) }}
          >
            {/* The page and the marks on it turn together; a mark's place is a
                share of the page as scanned, so it holds through zoom and rotate. */}
            <div
              style={{
                width: sideways ? "100cqh" : "100%",
                height: sideways ? "100cqw" : "100%",
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
              className={cn("absolute left-1/2 top-1/2", placing && onPlace && "cursor-crosshair")}
              onClick={(e) => {
                if (!placing || !onPlace) return
                const box = e.currentTarget
                const target = e.target as HTMLElement
                if (target !== box && target.tagName !== "IMG") return
                const { offsetX, offsetY } = e.nativeEvent
                onPlace({ page: current + 1, x: Math.min(1, Math.max(0, offsetX / box.clientWidth)), y: Math.min(1, Math.max(0, offsetY / box.clientHeight)) })
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={shown.url}
                src={shown.url}
                alt={`Page ${current + 1} of ${studentName}'s paper`}
                draggable={false}
                onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight) }}
                className="h-full w-full max-w-none object-contain"
              />
              {stamps.filter((s) => s.page === current + 1).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onPickStamp?.(s) }}
                  disabled={!onPickStamp}
                  style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: `translate(-50%, -50%) rotate(${-rotation}deg)` }}
                  className="absolute cursor-pointer disabled:cursor-default"
                  aria-label={`${s.text} on question ${s.question}${onPickStamp ? ": move or take off" : ""}`}
                >
                  <StampLabel stamp={s} />
                </button>
              ))}
            </div>
          </div>
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(current - 1)} disabled={current === 0} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-white shadow hover:bg-slate-900 disabled:opacity-0" aria-label="Previous page"><ChevronLeft className="h-6 w-6" /></button>
            <button type="button" onClick={() => go(current + 1)} disabled={current === count - 1} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-white shadow hover:bg-slate-900 disabled:opacity-0" aria-label="Next page"><ChevronRight className="h-6 w-6" /></button>
          </>
        )}
      </div>

      {count > 1 && (
        <nav aria-label="Pages" className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-2 py-2">
          {pages.map((p, i) => (
            <button
              key={p.url}
              type="button"
              onClick={() => go(i)}
              aria-label={`Page ${i + 1}`}
              aria-current={i === current ? "page" : undefined}
              className={cn("relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-white ring-2 ring-offset-1 ring-offset-slate-900", i === current ? "ring-sky-400" : "ring-transparent opacity-70 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
              <span className="absolute bottom-0 right-0 rounded-tl bg-slate-900/80 px-1 text-[10px] font-semibold leading-4">{i + 1}</span>
            </button>
          ))}
        </nav>
      )}
    </section>
  )
}

/**
 * The paper with the teacher's marks on it, for printing (hidden on screen):
 * one page per sheet after the report, so marked papers can be handed back.
 */
export function MarkedPages({ pages, stamps, studentName }: { pages: PaperPage[]; stamps: PaperStamp[]; studentName: string }) {
  if (!pages.length || !stamps.length) return null
  return (
    <div className="hidden print:block">
      {pages.map((p, i) => (
        <div key={p.url} className="relative mx-auto break-before-page" style={{ width: "fit-content" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={`Page ${i + 1} of ${studentName}'s paper`} className="block max-h-[9.6in] max-w-full" />
          {stamps.filter((s) => s.page === i + 1).map((s) => (
            <span key={s.key} className="absolute" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: "translate(-50%, -50%)" }}>
              <StampLabel stamp={s} />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

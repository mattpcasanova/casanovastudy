"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PaperPage } from "@/lib/grading/paper-pages"

// The student's paper beside the report, so the teacher can check an answer
// the grader flagged ("Check this") without the stack of papers in front of
// them. On a laptop it's a sticky column next to the report; on a phone it
// covers the screen. One page at a time with arrows (keyboard too), a strip
// of thumbnails to jump, zoom and rotate (phone photos come in sideways).

const ZOOMS = [1, 1.5, 2, 3]

export function PaperViewer({ pages, page, onPage, studentName, onClose, className }: {
  pages: PaperPage[]
  /** 0-based page shown. */
  page: number
  onPage: (page: number) => void
  studentName: string
  onClose: () => void
  className?: string
}) {
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
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [current, go, onClose])

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
            onDoubleClick={() => setZoomIndex((z) => (z === 0 ? 2 : 0))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={shown.url}
              src={shown.url}
              alt={`Page ${current + 1} of ${studentName}'s paper`}
              draggable={false}
              onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight) }}
              style={{
                width: sideways ? "100cqh" : "100%",
                height: sideways ? "100cqw" : "100%",
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
              className="absolute left-1/2 top-1/2 max-w-none object-contain"
            />
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

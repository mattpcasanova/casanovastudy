"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { normalizeGuideMarkdown } from "@/lib/formats/normalize"
import { StudyMarkdown } from "@/components/formats/study-markdown"

interface Props {
  title: string
  format: string
  content: string
  statusMessage: string
  isComplete: boolean
}

// Quiz/flashcard markers are parsed by their viewers; in the live preview show
// them as readable labels instead of raw MC_QUESTION: / Correct Answer: lines.
function previewMarkdown(raw: string, format: string): string {
  let md = raw
  if (format === "quiz") {
    md = md
      .replace(/^\s*(?:\*\*)?(MC|TF|SA)_QUESTION:(?:\*\*)?\s*/gm, "\n**Question.** ")
      .replace(/^\s*([A-F])\)\s+/gm, "- **$1.** ")
      .replace(/^\s*(Correct Answer|Answer|Sample Answer|Explanation):.*$/gim, "")
  } else if (format === "plan") {
    md = md
      .replace(/^\s*(?:\*\*)?UNIT:(?:\*\*)?\s*(.*)$/gim, "\n### $1")
      .replace(/^\s*(?:\*\*)?(GOAL|COVERS|FORMAT|TIME):(?:\*\*)?\s*(.*)$/gim, (_m, k: string, v: string) => `- **${k.charAt(0) + k.slice(1).toLowerCase()}:** ${v}`)
  } else if (format === "practice") {
    md = md
      .replace(/^\s*(?:\*\*)?(MATCH|FILL|ORDER|SORT|MC_QUESTION|TF_QUESTION):(?:\*\*)?\s*/gm, (_m, kind: string) => `\n**${{ MATCH: "Match", FILL: "Fill in", ORDER: "Order", SORT: "Sort", MC_QUESTION: "Question", TF_QUESTION: "True or false" }[kind.toUpperCase()] ?? kind}.** `)
      .replace(/\{\{([^{}|]+)[^{}]*\}\}/g, "_____")
      .replace(/^\s*(Correct Answer|Answer|Explanation):.*$/gim, "")
  } else if (format === "timeline") {
    md = md
      .replace(/^\s*(?:\*\*)?EVENT:(?:\*\*)?\s*(.*)$/gim, (_m, v: string) => `\n**${v.replace(/\s*\|\s*/, " · ")}**`)
      .replace(/^\s*(?:\*\*)?(WHAT|WHY|DETAIL|SIGNIFICANCE):(?:\*\*)?\s*/gim, "")
  } else if (format === "flashcards") {
    md = md.replace(/^\s*(?:\*\*)?Q:(?:\*\*)?\s*/gm, "\n**Q:** ").replace(/\n\s*(?:\*\*)?A:(?:\*\*)?\s*/g, "  \n**A:** ") // hard break → answer on its own line
  }
  return normalizeGuideMarkdown(md)
}

const STAGES = ["Getting ready", "Planning", "Writing", "Saving"]

export default function StudyGuideGenerating({ title, format, content, statusMessage, isComplete }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  // Re-render the preview at most ~4x/second — markdown parsing every token is wasteful.
  // (A debounce would never fire mid-stream — tokens arrive faster than the delay.)
  const latest = useRef(content)
  latest.current = content
  const [throttled, setThrottled] = useState(content)
  useEffect(() => {
    const id = setInterval(() => setThrottled(latest.current), 250)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (isComplete) setThrottled(content)
  }, [isComplete, content])
  const md = useMemo(() => previewMarkdown(throttled, format), [throttled, format])

  useEffect(() => {
    if (isComplete) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isComplete])

  useEffect(() => {
    const el = scrollRef.current
    if (el && follow) el.scrollTo({ top: el.scrollHeight })
  }, [md, follow])

  const stage = isComplete ? 4 : /saving/i.test(statusMessage) ? 3 : content ? 2 : elapsed > 4 ? 1 : 0
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute -top-24 right-[10%] h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="container relative mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
            {isComplete ? "Done" : "Building your study guide"}
          </p>
          <h1 className={cn(fontDisplay, "mt-2 text-3xl font-semibold leading-tight sm:text-4xl")}>{title}</h1>
          <ol className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm">
            {STAGES.map((s, i) => {
              const done = i < stage
              const active = i === stage
              return (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 transition",
                      done ? "bg-white/25 text-white" : active ? "bg-white text-blue-800 shadow" : "bg-white/10 text-white/60"
                    )}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {s}
                  </span>
                  {i < STAGES.length - 1 && <span className="hidden h-px w-3 bg-white/40 sm:block" />}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <div className="container relative mx-auto -mt-16 max-w-3xl px-4 pb-16">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-blue-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Sparkles className="h-4 w-4 animate-pulse text-blue-600" />}
              {statusMessage || "Starting…"}
            </span>
            <span className="tabular-nums text-slate-400">
              {words > 0 ? `${words.toLocaleString()} words · ` : ""}{elapsed}s
            </span>
          </div>
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget
              setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
            }}
            className="relative h-[60vh] min-h-[320px] overflow-y-auto px-6 py-6 sm:px-8"
          >
            {md ? (
              <>
                <StudyMarkdown content={md} />
                {!isComplete && <span className="ml-0.5 inline-block h-5 w-1.5 animate-pulse rounded-sm bg-blue-600 align-middle" />}
              </>
            ) : (
              <div className="space-y-4 pt-2" aria-label="Loading">
                {[45, 90, 80, 95, 60, 85, 70].map((w, i) => (
                  <div key={i} className={cn("h-3 animate-pulse rounded-full bg-slate-100", i === 0 && "h-6")} style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
                ))}
                <p className="pt-4 text-center text-sm text-slate-400">
                  Planning your guide. Text will start appearing in a few seconds.
                </p>
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          {isComplete ? "Opening your guide…" : "Keep this tab open. The guide saves automatically when it's done."}
        </p>
      </div>
    </div>
  )
}

"use client"

// The Edit page for a guide you own: rename it, set its standards, and change
// any question, card or section. The guide is cut into pieces and labeled
// fields by lib/guide-edit/pieces.ts and put back together on save, so nothing
// the viewer reads is lost. "Change it for me" rewrites one piece from a short
// instruction. On a guide assigned to students, wording can change but the
// questions can't be added or removed (their answers are matched by position).

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Eye, EyeOff, Info, Loader2, PenLine, Trash2, Undo2 } from "lucide-react"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { StudyMarkdown } from "@/components/formats/study-markdown"
import { normalizeGuideMarkdown } from "@/lib/formats/normalize"
import { fontDisplay } from "@/lib/formats/design"
import { displaySerif } from "@/lib/formats/fonts"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/lib/auth"
import { usePlan } from "@/components/plan/plan-provider"
import { STANDARDS_MAX } from "@/lib/standards"
import { StandardsField } from "@/components/standards-field"
import { BODY_HINTS, GUIDE_TITLE_MAX, ITEM_NOUN, editProblem, isEditableFormat, joinFields, joinPieces, pieceFields, splitPieces, type EditableFormat, type Field, type Piece } from "@/lib/guide-edit/pieces"
import type { StudyGuideRecord } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface DraftPiece extends Piece {
  removed?: boolean
  /** Text before the last "Change it for me", for Undo. */
  previous?: string
}

const PROSE: ReadonlySet<string> = new Set(["outline", "summary", "cheatsheet"])
const inputBox = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"

/** A textarea that is as tall as its text. */
function AutoTextarea({ value, onChange, className, ...rest }: { value: string; onChange: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputBox, "resize-none overflow-hidden leading-relaxed", className)} {...rest} />
}

function FieldRow({ field, fields, index, uid, onChange }: { field: Field; fields: Field[]; index: number; uid: string; onChange: (value: string) => void }) {
  const id = `${uid}-f${index}`
  if (field.type === "heading") {
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-700">Heading</label>
        <input id={id} value={field.value} onChange={(e) => onChange(e.target.value)} className={cn(inputBox, "font-semibold")} />
      </div>
    )
  }
  if (field.type === "option") {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700" aria-hidden="true">{field.letter}</span>
        <AutoTextarea aria-label={`Option ${field.letter}`} value={field.value} onChange={onChange} />
      </div>
    )
  }
  if (field.type === "line") {
    const letters = fields.filter((f) => f.type === "option").map((f) => (f as { letter: string }).letter)
    const isKey = field.key === "CORRECT ANSWER" || field.key === "ANSWER"
    const keyLetter = field.value.match(/^\W*([A-F])\W*$/i)?.[1].toUpperCase()
    // A multiple-choice key: pick the letter instead of typing it.
    if (isKey && letters.length > 0 && (keyLetter || !field.value.trim())) {
      return (
        <div role="radiogroup" aria-label="Correct answer" className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Correct answer</span>
          {letters.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={keyLetter === l} onClick={() => onChange(l)}
              className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ring-1 transition", keyLetter === l ? "bg-emerald-700 text-white ring-emerald-700" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")}>
              {l}
            </button>
          ))}
        </div>
      )
    }
    const tf = fields.some((f) => f.type === "line" && f.key === "TF_QUESTION") && isKey && /^\W*(true|false)\W*$/i.test(field.value)
    if (tf) {
      const now = /true/i.test(field.value)
      return (
        <div role="radiogroup" aria-label="Correct answer" className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Correct answer</span>
          {[true, false].map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={now === v} onClick={() => onChange(v ? "True" : "False")}
              className={cn("h-10 rounded-xl px-4 text-sm font-bold ring-1 transition", now === v ? "bg-emerald-700 text-white ring-emerald-700" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")}>
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      )
    }
    const hint = BODY_HINTS[field.key] && (field.key === "FILL" || field.key === "EVENT" || field.key === "NUM_QUESTION") ? BODY_HINTS[field.key] : null
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-700">{field.label}</label>
        <AutoTextarea id={id} value={field.value} onChange={onChange} />
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
    )
  }
  // Free text: the body under a marker (pairs, steps, a figure or passage block) or a section's writing.
  if (!field.value.trim()) return null
  const before = fields.slice(0, index).reverse().find((f) => f.type === "line") as Extract<Field, { type: "line" }> | undefined
  const hint = before && (before.key === "MATCH" || before.key === "ORDER" || before.key === "SORT") ? BODY_HINTS[before.key] : null
  const fenced = /^\s*(`{3,}|~{3,})/m.test(field.value)
  return (
    <div>
      <AutoTextarea aria-label={hint ? `${before!.label} lines` : "Text"} value={field.value} onChange={onChange} className={cn(fenced && "font-mono text-sm")} spellCheck={!fenced} />
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {fenced && <p className="mt-1 text-sm text-slate-500">A figure, passage or code block. Keep the lines that start and end it.</p>}
    </div>
  )
}

const PieceCard = memo(function PieceCard({ piece, format, label, locked, guideId, onText, onRemove, onRevised, onUndo }: {
  piece: DraftPiece
  format: EditableFormat
  label: string
  locked: boolean
  guideId: string
  onText: (id: number, text: string) => void
  onRemove: (id: number, removed: boolean) => void
  onRevised: (id: number, text: string) => void
  onUndo: (id: number) => void
}) {
  const { openPremium } = usePlan()
  const fields = useMemo(() => pieceFields(format, piece.text), [format, piece.text])
  const [asking, setAsking] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState(false)
  const uid = `piece-${piece.id}`
  const isItem = piece.kind === "item"
  // Assigned quizzes and practice keep their items; headings and prose can still go.
  const canRemove = piece.kind !== "title" && !(locked && isItem && (format === "quiz" || format === "practice" || format === "adaptive"))

  const change = (index: number, value: string) => {
    const next = fields.map((f, i) => (i === index ? { ...f, value } : f)) as Field[]
    onText(piece.id, joinFields(next))
  }

  const revise = async () => {
    if (instruction.trim().length < 3 || busy) return
    setBusy(true); setError("")
    try {
      const res = await authFetch(`/api/study-guides/${guideId}/edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ piece: piece.text, instruction }) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data?.code) { openPremium(data); return }
      if (!res.ok || typeof data.piece !== "string") throw new Error(data.error || "Could not make that change.")
      onRevised(piece.id, data.piece)
      setInstruction(""); setAsking(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make that change.")
    } finally {
      setBusy(false)
    }
  }

  if (piece.removed) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">{label}</span> will be removed when you save.</p>
        <button type="button" className={actionButton} onClick={() => onRemove(piece.id, false)}><Undo2 />Put it back</button>
      </li>
    )
  }

  return (
    <li className={cn("rounded-2xl border bg-white p-4 shadow-sm", isItem ? "border-slate-200" : "border-slate-200 bg-slate-50/60")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {piece.previous !== undefined && <button type="button" className={actionButton} onClick={() => onUndo(piece.id)}><Undo2 />Undo change</button>}
          {PROSE.has(format) && piece.kind !== "title" && (
            <button type="button" className={actionButton} onClick={() => setPreview((v) => !v)} aria-pressed={preview}>{preview ? <EyeOff /> : <Eye />}{preview ? "Hide preview" : "Preview"}</button>
          )}
          {piece.kind !== "title" && <button type="button" className={actionButton} onClick={() => { setAsking((v) => !v); setError("") }} aria-expanded={asking}><PenLine />Change it for me</button>}
          {canRemove && <button type="button" className={cn(actionButton, "text-red-700 hover:bg-red-50 hover:text-red-800")} onClick={() => onRemove(piece.id, true)} aria-label={`Remove ${label}`}><Trash2 /><span className="hidden sm:inline">Remove</span></button>}
        </div>
      </div>

      {asking && (
        <div className="mb-4 rounded-xl bg-blue-50 p-3 ring-1 ring-inset ring-blue-200">
          <label htmlFor={`${uid}-ask`} className="mb-1 block text-sm font-semibold text-slate-800">What should change?</label>
          <AutoTextarea id={`${uid}-ask`} value={instruction} onChange={(v) => setInstruction(v.slice(0, 600))} placeholder={isItem ? "e.g. Make it easier, use a sports example, write a new question on the same idea" : "e.g. Shorter, simpler words, add an example"} disabled={busy}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void revise() } }} />
          {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button type="button" className={actionButton} onClick={() => setAsking(false)} disabled={busy}>Cancel</button>
            <button type="button" className={actionButtonPrimary} onClick={() => void revise()} disabled={busy || instruction.trim().length < 3}>{busy ? <Loader2 className="animate-spin" /> : <PenLine />}{busy ? "Rewriting…" : "Rewrite it"}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((f, i) => <FieldRow key={i} field={f} fields={fields} index={i} uid={uid} onChange={(v) => change(i, v)} />)}
      </div>

      {preview && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">How it reads</p>
          <StudyMarkdown content={normalizeGuideMarkdown(piece.text)} compact />
        </div>
      )}
    </li>
  )
})

export default function GuideEditor({ guide }: { guide: StudyGuideRecord }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const editable = isEditableFormat(guide.format)
  const format = (editable ? guide.format : "summary") as EditableFormat
  const original = guide.content ?? ""

  const [title, setTitle] = useState(guide.title)
  const [standards, setStandards] = useState(guide.standards ?? "")
  const [pieces, setPieces] = useState<DraftPiece[]>(() => (editable ? splitPieces(format, original) : []))
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const isOwner = !!user && user.id === guide.user_id
  useEffect(() => {
    if (!isOwner) return
    void authFetch(`/api/study-guides/${guide.id}/edit`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.locked) setLocked(true) }).catch(() => {})
  }, [guide.id, isOwner])

  const content = useMemo(() => joinPieces(pieces.filter((p) => !p.removed)), [pieces])
  const baseline = useMemo(() => (editable ? joinPieces(splitPieces(format, original)) : ""), [editable, format, original])
  const contentChanged = editable && content !== baseline
  const dirty = contentChanged || title.trim() !== guide.title || standards.trim() !== (guide.standards ?? "").trim()
  const problem = useMemo(() => (contentChanged ? editProblem(format, original, content, locked) : null), [contentChanged, format, original, content, locked])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const onText = useCallback((id: number, text: string) => setPieces((list) => list.map((p) => (p.id === id ? { ...p, text } : p))), [])
  const onRemove = useCallback((id: number, removed: boolean) => setPieces((list) => list.map((p) => (p.id === id ? { ...p, removed } : p))), [])
  const onRevised = useCallback((id: number, text: string) => setPieces((list) => list.map((p) => (p.id === id ? { ...p, previous: p.text, text } : p))), [])
  const onUndo = useCallback((id: number) => setPieces((list) => list.map((p) => (p.id === id && p.previous !== undefined ? { ...p, text: p.previous, previous: undefined } : p))), [])

  const save = async () => {
    if (saving || !dirty) return
    if (!title.trim()) { setError("The guide needs a name."); return }
    if (problem) { setError(problem); return }
    setSaving(true); setError("")
    try {
      const res = await authFetch(`/api/study-guides/${guide.id}/edit`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, standards, ...(contentChanged ? { content } : {}) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save your changes.")
      router.push(`/study-guide/${guide.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your changes.")
      setSaving(false)
    }
  }

  // "Question 3", "Card 12": numbered among the items still in the guide.
  const labels = useMemo(() => {
    let n = 0
    return pieces.map((p) => {
      if (p.kind === "title") return "Title inside the guide"
      if (p.kind === "item") { if (!p.removed) n++; return `${ITEM_NOUN[format]} ${p.removed ? "" : n}`.trim() }
      if (p.kind === "heading") return "Topic heading"
      if (p.kind === "section") return ITEM_NOUN[format]
      return "Text"
    })
  }, [pieces, format])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>You can only edit your own guides</h1>
        <p className="mt-2 text-slate-600">{user ? "Save this guide to My Guides first, then edit your copy." : "Sign in to edit your guides."}</p>
        <Link href={`/study-guide/${guide.id}`} className={cn(actionButtonPrimary, "mt-5")}><ArrowLeft />Back to the guide</Link>
      </div>
    )
  }

  const removed = pieces.filter((p) => p.removed).length
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50 pb-28")}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/study-guide/${guide.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"><ArrowLeft className="h-4 w-4" />Back to the guide</Link>
            <h1 className={cn(fontDisplay, "mt-2 text-3xl font-semibold text-slate-900")}>Edit guide</h1>
            <p className="mt-1 text-slate-600">Change any wording, or ask for a part to be rewritten. Nothing changes until you save.</p>
          </div>
        </div>

        <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label htmlFor="guide-title" className="mb-1 block text-sm font-semibold text-slate-700">Name</label>
            <input id="guide-title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, GUIDE_TITLE_MAX))} className={cn(inputBox, "font-semibold")} />
          </div>
          <div>
            <label htmlFor="guide-standards" className="mb-1 block text-sm font-semibold text-slate-700">Standards <span className="font-normal text-slate-500">(optional)</span></label>
            <StandardsField id="guide-standards" value={standards} onChange={(v) => setStandards(v.slice(0, STANDARDS_MAX))} grade={guide.grade_level ?? null} subject={guide.subject ?? null} help="Shown at the top of the guide and on the printout." />
          </div>
        </section>

        {locked && editable && (format === "quiz" || format === "practice" || format === "adaptive") && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-blue-50 p-4 text-sm text-slate-800 ring-1 ring-inset ring-blue-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
            <span><span className="font-semibold">This one is assigned to students.</span> Change any wording, answer or explanation you like. {format === "quiz" ? "Questions" : "Activities"} can&apos;t be added or removed, because students&apos; answers are matched to them in order. Students who already finished keep the score they got.</span>
          </p>
        )}

        {!editable ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            {guide.format === "custom"
              ? <span>This guide was made in the custom builder. <Link href={`/create-guide?edit=${guide.id}`} className="font-semibold text-blue-700 underline">Open it there</Link> to change what is in it.</span>
              : <span>You can rename this study plan and set its standards here. Changing what is inside it isn&apos;t available yet.</span>}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pieces.map((p, i) => (
              <PieceCard key={p.id} piece={p} format={format} label={labels[i]} locked={locked} guideId={guide.id} onText={onText} onRemove={onRemove} onRevised={onRevised} onUndo={onUndo} />
            ))}
          </ul>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className={cn("min-w-0 flex-1 text-sm", error || problem ? "font-medium text-red-700" : "text-slate-600")} role={error || problem ? "alert" : undefined}>
            {error || problem || (dirty ? `Unsaved changes${removed ? ` · ${removed} to remove` : ""}` : "No changes yet")}
          </p>
          <div className="flex gap-2">
            <Link href={`/study-guide/${guide.id}`} className={actionButton}>Cancel</Link>
            <button type="button" className={actionButtonPrimary} onClick={() => void save()} disabled={saving || !dirty || !!problem}>{saving ? <Loader2 className="animate-spin" /> : <Check />}{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

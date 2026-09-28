"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Copy, X, Plus, Puzzle, PencilLine, ListOrdered, Columns2, HelpCircle, ToggleLeft, CheckCircle2, Circle, AlertTriangle, Brackets, Bug, Code2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  EditorBlock, PracticeBlockData, createEmptyActivity, generateActivityId,
} from "@/lib/types/editor-blocks"
import {
  type PracticeActivity, type MatchActivity, type FillActivity, type OrderActivity, type SortActivity, type ChoiceActivity, type BugActivity, type CodeSnippet,
  parseFillSentence, fillToSentence, isPlayable, isTrueFalse,
} from "@/lib/formats/practice"
import { CodeLines } from "@/components/formats/code-view"
import { AddRowButton, AutoTextarea, InlineInput, Segmented, fieldLabel, focusLater } from "../editor-ui"

interface PracticeBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

type KindChoice = PracticeActivity["kind"] | "tf"

const KINDS: { value: KindChoice; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "match", label: "Match", icon: Puzzle },
  { value: "fill", label: "Fill in", icon: PencilLine },
  { value: "order", label: "Order", icon: ListOrdered },
  { value: "sort", label: "Sort", icon: Columns2 },
  { value: "choice", label: "Multiple choice", icon: HelpCircle },
  { value: "tf", label: "True / false", icon: ToggleLeft },
  { value: "bug", label: "Find the bug", icon: Bug },
]

const LANGUAGES = [
  ["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["java", "Java"], ["cpp", "C++"],
  ["c", "C"], ["csharp", "C#"], ["go", "Go"], ["rust", "Rust"], ["sql", "SQL"], ["bash", "Bash"], ["ruby", "Ruby"],
  ["kotlin", "Kotlin"], ["swift", "Swift"], ["php", "PHP"], ["pseudocode", "Pseudocode"],
] as const

const kindOf = (a: PracticeActivity): KindChoice => (isTrueFalse(a) ? "tf" : a.kind)

const iconBtn =
  "flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
const rowField =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"

// What's still missing before an activity can be played (shown as a hint).
function missingHint(a: PracticeActivity): string | null {
  if (isPlayable(a)) return null
  switch (a.kind) {
    case "match": return "Add at least 2 complete pairs"
    case "fill": return "Put at least one answer in [brackets]"
    case "order": return "Add at least 2 steps"
    case "sort": return "Add 2 named groups with at least one item each"
    case "choice": return isTrueFalse(a) ? "Write the statement" : "Write the question and at least 2 options"
    case "bug": return "Add at least 2 lines of code, then click the line with the bug"
  }
}

export function PracticeBlock({ block, onUpdate }: PracticeBlockProps) {
  const data = block.data as PracticeBlockData
  // Latest data in a ref so per-activity callbacks stay stable and memoized
  // activity editors don't all re-render on every keystroke.
  const dataRef = useRef(data)
  dataRef.current = data
  const [focusId, setFocusId] = useState<string | null>(null)

  const setActivities = useCallback(
    (fn: (list: PracticeActivity[]) => PracticeActivity[]) =>
      onUpdate({ data: { ...dataRef.current, activities: fn(dataRef.current.activities) } }),
    [onUpdate]
  )

  const change = useCallback((id: string, next: PracticeActivity) => setActivities(list => list.map(a => (a.id === id ? next : a))), [setActivities])
  const remove = useCallback((id: string) => setActivities(list => list.filter(a => a.id !== id)), [setActivities])
  const duplicate = useCallback((id: string) => setActivities(list => {
    const i = list.findIndex(a => a.id === id)
    if (i < 0) return list
    const copy = { ...JSON.parse(JSON.stringify(list[i])), id: generateActivityId() } as PracticeActivity
    return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)]
  }), [setActivities])
  const move = useCallback((id: string, dir: -1 | 1) => setActivities(list => {
    const i = list.findIndex(a => a.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return list
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  }), [setActivities])

  const add = (kind: KindChoice) => {
    const a = createEmptyActivity(kind)
    setActivities(list => [...list, a])
    setFocusId(a.id)
  }

  return (
    <div className="space-y-3">
      <InlineInput
        value={block.title || ""}
        onChange={(e) => onUpdate({ title: e.target.value })}
        placeholder="Practice title — e.g. Cell organelles review"
        className="text-base font-semibold text-slate-900"
      />

      <div className="space-y-3">
        {data.activities.map((activity, index) => (
          <ActivityEditor
            key={activity.id}
            activity={activity}
            index={index}
            count={data.activities.length}
            autoFocus={focusId === activity.id}
            onChange={change}
            onRemove={remove}
            onDuplicate={duplicate}
            onMove={move}
          />
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5">
        <p className={cn(fieldLabel, "mb-2 flex items-center gap-1.5")}>
          <Plus className="h-3 w-3" /> Add activity
          <span className="ml-auto normal-case tracking-normal font-normal text-slate-300">
            {data.activities.length} {data.activities.length === 1 ? "activity" : "activities"}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map(k => (
            <button
              key={k.value}
              type="button"
              onClick={() => add(k.value)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            >
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const ActivityEditor = memo(function ActivityEditor({
  activity, index, count, autoFocus, onChange, onRemove, onDuplicate, onMove,
}: {
  activity: PracticeActivity
  index: number
  count: number
  autoFocus: boolean
  onChange: (id: string, next: PracticeActivity) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
}) {
  const id = activity.id
  const set = (next: PracticeActivity) => onChange(id, next)
  const hint = missingHint(activity)
  const firstField = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (autoFocus) focusLater(() => firstField.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const bindFirst = (el: HTMLElement | null) => { firstField.current = el }

  // Switching type starts a fresh activity of that kind, keeping id,
  // explanation and any code snippet (it becomes the bug code and vice versa).
  const switchKind = (kind: KindChoice) => {
    if (kind === kindOf(activity)) return
    const fresh = createEmptyActivity(kind)
    const code = activity.code?.text.trim() ? activity.code : undefined
    if (fresh.kind === "bug") {
      set({ ...fresh, id, explanation: activity.explanation, code: code ?? fresh.code } as PracticeActivity)
    } else {
      set({ ...fresh, id, explanation: activity.explanation, ...(code ? { code } : {}) } as PracticeActivity)
    }
  }

  return (
    <div className="group/act relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-orange-50/40 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500 text-[0.7rem] font-bold text-white">{index + 1}</span>
        <Segmented size="xs" value={kindOf(activity)} options={KINDS} onChange={switchKind} className="bg-white/80" />
        <div className="ml-auto flex items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-hover/act:opacity-100 md:group-focus-within/act:opacity-100">
          <button type="button" className={iconBtn} onClick={() => onMove(id, -1)} disabled={index === 0} aria-label="Move activity up"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" className={iconBtn} onClick={() => onMove(id, 1)} disabled={index === count - 1} aria-label="Move activity down"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button type="button" className={iconBtn} onClick={() => onDuplicate(id)} aria-label="Duplicate activity"><Copy className="h-3.5 w-3.5" /></button>
          <button type="button" className={cn(iconBtn, "hover:bg-rose-50 hover:text-rose-600")} onClick={() => onRemove(id)} aria-label="Delete activity"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {activity.kind === "match" && <MatchFields a={activity} set={set} bindFirst={bindFirst} />}
        {activity.kind === "fill" && <FillFields a={activity} set={set} bindFirst={bindFirst} />}
        {activity.kind === "order" && <OrderFields a={activity} set={set} bindFirst={bindFirst} />}
        {activity.kind === "sort" && <SortFields a={activity} set={set} bindFirst={bindFirst} />}
        {activity.kind === "choice" && <ChoiceFields a={activity} set={set} bindFirst={bindFirst} />}
        {activity.kind === "bug" && <BugFields a={activity} set={set} bindFirst={bindFirst} />}
        {activity.kind !== "bug" && (
          <CodeSnippetField
            code={activity.code}
            onChange={(code) => {
              const next = { ...activity } as PracticeActivity
              if (code) next.code = code
              else delete next.code
              set(next)
            }}
          />
        )}

        <InlineInput
          value={activity.explanation ?? ""}
          onChange={(e) => set({ ...activity, explanation: e.target.value })}
          placeholder="Explanation (optional) — shown after the student answers"
          className="text-sm text-slate-600"
        />
        {hint && (
          <p className="flex items-center gap-1.5 px-2 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {hint} — until then it&apos;s hidden from students.
          </p>
        )}
      </div>
    </div>
  )
})

type FieldProps<T> = { a: T; set: (next: PracticeActivity) => void; bindFirst: (el: HTMLElement | null) => void }

function PromptInput({ value, onChange, placeholder, bindFirst }: { value: string; onChange: (v: string) => void; placeholder: string; bindFirst?: (el: HTMLElement | null) => void }) {
  return (
    <InlineInput
      ref={bindFirst}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="font-medium text-slate-900"
    />
  )
}

function RowRemove({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className={cn(iconBtn, "shrink-0 hover:bg-rose-50 hover:text-rose-600")} onClick={onClick} aria-label={label}>
      <X className="h-3.5 w-3.5" />
    </button>
  )
}

function MatchFields({ a, set, bindFirst }: FieldProps<MatchActivity>) {
  const setPairs = (pairs: MatchActivity["pairs"]) => set({ ...a, pairs })
  return (
    <>
      <PromptInput value={a.prompt} onChange={(prompt) => set({ ...a, prompt })} placeholder="Instruction — e.g. Match each organelle to its job" bindFirst={bindFirst} />
      <div className="space-y-1.5">
        {a.pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={cn(rowField, "font-medium")} value={p.term} placeholder={`Term ${i + 1}`} onChange={(e) => setPairs(a.pairs.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)))} />
            <span className="text-slate-300">=</span>
            <input className={rowField} value={p.definition} placeholder="Matches with…" onChange={(e) => setPairs(a.pairs.map((x, j) => (j === i ? { ...x, definition: e.target.value } : x)))} />
            <RowRemove onClick={() => setPairs(a.pairs.filter((_, j) => j !== i))} label="Remove pair" />
          </div>
        ))}
      </div>
      {a.pairs.length < 8 && (
        <AddRowButton onClick={() => setPairs([...a.pairs, { term: "", definition: "" }])}><Plus className="h-4 w-4" /> Add pair</AddRowButton>
      )}
    </>
  )
}

function FillFields({ a, set, bindFirst }: FieldProps<FillActivity>) {
  // Edit a local string so the caret never jumps; store parsed parts.
  const [text, setText] = useState(() => fillToSentence(a.parts))
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const update = (value: string) => {
    setText(value)
    set({ ...a, parts: parseFillSentence(value) })
  }

  // Wrap the current selection in [brackets] to turn it into a blank.
  const makeBlank = () => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    if (s === e) return
    const picked = text.slice(s, e).trim()
    if (!picked) return
    const next = `${text.slice(0, s)}[${picked}]${text.slice(e)}`
    update(next)
    focusLater(() => el)
  }

  const blanks = a.parts.filter((p) => typeof p !== "string").length
  return (
    <>
      <AutoTextarea
        ref={(el) => { ref.current = el; bindFirst(el) }}
        value={text}
        onChange={(e) => update(e.target.value)}
        placeholder="The [mitochondria|mitochondrion] is where cellular respiration happens."
        className="text-slate-900"
        minRows={2}
      />
      <div className="flex flex-wrap items-center gap-2 px-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={makeBlank}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
        >
          <Brackets className="h-3.5 w-3.5" /> Make selection a blank
        </button>
        <span className="text-xs text-slate-400">or type the answer in [brackets] · add alternates with |</span>
      </div>
      {blanks > 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-loose text-slate-700 ring-1 ring-inset ring-slate-100">
          <span className={cn(fieldLabel, "mr-2")}>Preview</span>
          {a.parts.map((p, i) =>
            typeof p === "string" ? (
              <span key={i}>{p}</span>
            ) : (
              <span key={i} className="mx-0.5 inline-block rounded-md border-b-2 border-orange-400 bg-orange-50 px-2 font-semibold text-orange-800" title={p.answers.join(" / ")}>
                {p.answers[0]}{p.answers.length > 1 && <span className="ml-1 text-[0.65rem] font-normal text-orange-500">+{p.answers.length - 1}</span>}
              </span>
            )
          )}
        </div>
      )}
    </>
  )
}

function OrderFields({ a, set, bindFirst }: FieldProps<OrderActivity>) {
  const setItems = (items: string[]) => set({ ...a, items })
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= a.items.length) return
    const next = [...a.items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }
  return (
    <>
      <PromptInput value={a.prompt} onChange={(prompt) => set({ ...a, prompt })} placeholder="Instruction — e.g. Put the stages of mitosis in order" bindFirst={bindFirst} />
      <p className="px-2 text-xs text-slate-400">Enter the steps in the correct order — students see them shuffled.</p>
      <div className="space-y-1.5">
        {a.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-100 text-xs font-bold text-orange-700">{i + 1}</span>
            <input className={rowField} value={item} placeholder={`Step ${i + 1}`} onChange={(e) => setItems(a.items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" className={iconBtn} onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="Move step up"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" className={iconBtn} onClick={() => moveItem(i, 1)} disabled={i === a.items.length - 1} aria-label="Move step down"><ArrowDown className="h-3.5 w-3.5" /></button>
            <RowRemove onClick={() => setItems(a.items.filter((_, j) => j !== i))} label="Remove step" />
          </div>
        ))}
      </div>
      {a.items.length < 8 && <AddRowButton onClick={() => setItems([...a.items, ""])}><Plus className="h-4 w-4" /> Add step</AddRowButton>}
    </>
  )
}

function SortFields({ a, set, bindFirst }: FieldProps<SortActivity>) {
  const setBuckets = (buckets: SortActivity["buckets"]) => set({ ...a, buckets })
  const setBucket = (i: number, patch: Partial<SortActivity["buckets"][number]>) =>
    setBuckets(a.buckets.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  return (
    <>
      <PromptInput value={a.prompt} onChange={(prompt) => set({ ...a, prompt })} placeholder="Instruction — e.g. Sort each example into the right category" bindFirst={bindFirst} />
      <div className={cn("grid gap-2", a.buckets.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {a.buckets.map((b, i) => (
          <div key={i} className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
            <div className="flex items-center gap-1">
              <input className={cn(rowField, "font-semibold")} value={b.name} placeholder={`Group ${i + 1}`} onChange={(e) => setBucket(i, { name: e.target.value })} />
              {a.buckets.length > 2 && <RowRemove onClick={() => setBuckets(a.buckets.filter((_, j) => j !== i))} label="Remove group" />}
            </div>
            {b.items.map((item, k) => (
              <div key={k} className="flex items-center gap-1">
                <input className={cn(rowField, "py-1 text-xs")} value={item} placeholder="Item" onChange={(e) => setBucket(i, { items: b.items.map((x, j) => (j === k ? e.target.value : x)) })} />
                {b.items.length > 1 && <RowRemove onClick={() => setBucket(i, { items: b.items.filter((_, j) => j !== k) })} label="Remove item" />}
              </div>
            ))}
            <button type="button" onClick={() => setBucket(i, { items: [...b.items, ""] })} className="w-full rounded-md px-1.5 py-1 text-left text-xs font-medium text-slate-400 hover:bg-white hover:text-orange-700">
              + Add item
            </button>
          </div>
        ))}
      </div>
      {a.buckets.length < 4 && (
        <AddRowButton onClick={() => setBuckets([...a.buckets, { name: "", items: [""] }])}><Plus className="h-4 w-4" /> Add group</AddRowButton>
      )}
    </>
  )
}

function ChoiceFields({ a, set, bindFirst }: FieldProps<ChoiceActivity>) {
  const tf = isTrueFalse(a)
  if (tf) {
    return (
      <>
        <AutoTextarea
          ref={bindFirst}
          value={a.prompt}
          onChange={(e) => set({ ...a, prompt: e.target.value })}
          placeholder="Statement — e.g. Bacteria have a nucleus."
          className="font-medium text-slate-900"
        />
        <div className="flex items-center gap-2 px-2">
          <span className={fieldLabel}>Answer</span>
          <Segmented
            value={a.correct === 0 ? "true" : "false"}
            options={[{ value: "true", label: "True" }, { value: "false", label: "False" }]}
            onChange={(v) => set({ ...a, correct: v === "true" ? 0 : 1 })}
          />
        </div>
      </>
    )
  }
  const setOptions = (options: string[], correct = a.correct) => set({ ...a, options, correct })
  return (
    <>
      <AutoTextarea
        ref={bindFirst}
        value={a.prompt}
        onChange={(e) => set({ ...a, prompt: e.target.value })}
        placeholder="Question"
        className="font-medium text-slate-900"
      />
      <div className="space-y-1.5">
        {a.options.map((opt, i) => {
          const right = a.correct === i
          return (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => set({ ...a, correct: i })}
                aria-label={right ? "Correct answer" : "Mark as correct answer"}
                title={right ? "Correct answer" : "Mark as correct"}
                className="shrink-0"
              >
                {right ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-slate-300 hover:text-emerald-400" />}
              </button>
              <span className="w-4 text-xs font-bold text-slate-400">{String.fromCharCode(65 + i)}</span>
              <input
                className={cn(rowField, right && "border-emerald-300 bg-emerald-50/50")}
                value={opt}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                onChange={(e) => setOptions(a.options.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {a.options.length > 2 && (
                <RowRemove
                  onClick={() => setOptions(a.options.filter((_, j) => j !== i), a.correct === i ? 0 : a.correct > i ? a.correct - 1 : a.correct)}
                  label="Remove option"
                />
              )}
            </div>
          )
        })}
      </div>
      {a.options.length < 6 && <AddRowButton onClick={() => setOptions([...a.options, ""])}><Plus className="h-4 w-4" /> Add option</AddRowButton>}
    </>
  )
}

// ── Code ────────────────────────────────────────────────────────────────────

function LanguageSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Code language"
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-orange-300"
    >
      {LANGUAGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      {!LANGUAGES.some(([v]) => v === value) && value && <option value={value}>{value}</option>}
    </select>
  )
}

function CodeTextarea({ value, onChange, placeholder, bindFirst }: { value: string; onChange: (v: string) => void; placeholder: string; bindFirst?: (el: HTMLElement | null) => void }) {
  return (
    <AutoTextarea
      ref={bindFirst}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // Tab indents inside code instead of leaving the field.
        if (e.key !== "Tab" || e.shiftKey) return
        e.preventDefault()
        const el = e.currentTarget
        const { selectionStart: s, selectionEnd: end } = el
        onChange(`${value.slice(0, s)}    ${value.slice(end)}`)
        requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4))
      }}
      spellCheck={false}
      placeholder={placeholder}
      minRows={3}
      // Override the inline-field hover/focus surfaces (slate-50 / white) so the dark editor stays dark.
      className="rounded-lg bg-slate-900 px-3 py-2 font-mono text-[0.82rem] leading-relaxed text-slate-100 placeholder:text-slate-500 hover:bg-slate-800 focus:border-slate-600 focus:bg-slate-900 focus:ring-slate-700/50"
    />
  )
}

/** Optional snippet shown above any activity ("what does this print?"). */
function CodeSnippetField({ code, onChange }: { code?: CodeSnippet; onChange: (code: CodeSnippet | undefined) => void }) {
  const [open, setOpen] = useState(!!code)
  if (!open && !code) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); onChange({ lang: "python", text: "" }) }}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-50 hover:text-orange-700"
      >
        <Code2 className="h-3.5 w-3.5" /> Add code snippet
      </button>
    )
  }
  const value = code ?? { lang: "python", text: "" }
  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
      <div className="flex items-center gap-2">
        <span className={cn(fieldLabel, "flex items-center gap-1")}><Code2 className="h-3 w-3" /> Code</span>
        <LanguageSelect value={value.lang} onChange={(lang) => onChange({ ...value, lang })} />
        <button type="button" onClick={() => { setOpen(false); onChange(undefined) }} className="ml-auto text-xs font-medium text-slate-400 hover:text-rose-600">
          Remove
        </button>
      </div>
      <CodeTextarea value={value.text} onChange={(text) => onChange({ ...value, text })} placeholder={"nums = [3, 1, 2]\nprint(sorted(nums)[-1])"} />
    </div>
  )
}

function BugFields({ a, set, bindFirst }: FieldProps<BugActivity>) {
  const lineCount = a.code.text.split("\n").length
  const toggleLine = (n: number) => {
    const has = a.bugLines.includes(n)
    set({ ...a, bugLines: has ? a.bugLines.filter((x) => x !== n) : [...a.bugLines, n].sort((x, y) => x - y) })
  }
  const setCode = (text: string) => {
    // Drop bug-line picks that no longer exist.
    const total = text.split("\n").length
    set({ ...a, code: { ...a.code, text }, bugLines: a.bugLines.filter((n) => n <= total) })
  }
  return (
    <>
      <PromptInput value={a.prompt} onChange={(prompt) => set({ ...a, prompt })} placeholder="Instruction — e.g. This should return the largest number. Find the bug." bindFirst={bindFirst} />
      <div className="flex items-center gap-2 px-2">
        <span className={fieldLabel}>Language</span>
        <LanguageSelect value={a.code.lang} onChange={(lang) => set({ ...a, code: { ...a.code, lang } })} />
      </div>
      <CodeTextarea value={a.code.text} onChange={setCode} placeholder={"def largest(nums):\n    best = 0\n    for n in nums:\n        if n > best:\n            best = n\n    return best"} />
      {a.code.text.trim() && lineCount >= 2 && (
        <div>
          <p className="px-2 text-xs text-slate-500">
            Click the buggy line{a.bugLines.length ? "s" : ""} below{a.bugLines.length ? ` — marked: ${a.bugLines.join(", ")}` : ""}.
          </p>
          <CodeLines
            lang={a.code.lang}
            text={a.code.text}
            onPick={toggleLine}
            lineState={(n) => (a.bugLines.includes(n) ? "wrong" : null)}
          />
        </div>
      )}
      <input
        className={cn(rowField, "font-mono")}
        value={a.fix ?? ""}
        onChange={(e) => set({ ...a, fix: e.target.value })}
        placeholder="Fixed line (optional) — e.g. best = nums[0]"
      />
    </>
  )
}

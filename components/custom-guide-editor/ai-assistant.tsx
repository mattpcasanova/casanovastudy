"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Sparkles, Loader2, Wand2, Plus, RefreshCw, Wand, SlidersHorizontal, List, ScrollText, CreditCard, HelpCircle, BookOpen, Table2, Check, Square, AlertCircle, FileText, Puzzle, Crown } from "lucide-react"
import { CustomGuideContent, CustomSection, GuideControls, GuideFormatChoice } from "@/lib/types/custom-guide"
import { EditorBlock, blocksToCustomContent } from "@/lib/types/editor-blocks"
import { Segmented, fieldLabel } from "./editor-ui"
import { Switch } from "@/components/ui/switch"
import VisualsInfo from "@/components/visuals-info"
import { visualsRelevant } from "@/lib/formats/figures"
import { authFetch } from "@/lib/auth-fetch"
import { isPlanBlock } from "@/lib/plan-rules"
import { usePlan } from "@/components/plan/plan-provider"

interface SourceFileForAI {
  name: string
  content?: string
  images?: Array<{ url: string; name: string }>
}

interface AIAssistantProps {
  subject: string
  gradeLevel: string
  currentBlocks: EditorBlock[]
  sourceFiles?: SourceFileForAI[] // prepared in the browser: text + uploaded photos/pages
  onContentGenerated: (content: CustomGuideContent, mode: 'replace' | 'add') => void
  onSectionAdded?: (section: CustomSection, mode: 'replace' | 'add', isFirst: boolean) => void
  onGeneratingChange?: (generating: boolean) => void
  disabled?: boolean
}

type DirectMode = 'generic' | 'specific'

const FORMAT_OPTIONS: { value: GuideFormatChoice; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'outline', label: 'Outline', icon: List },
  { value: 'summary', label: 'Summary', icon: ScrollText },
  { value: 'flashcards', label: 'Flashcards', icon: CreditCard },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle },
  { value: 'practice', label: 'Practice', icon: Puzzle },
  { value: 'definition', label: 'Definitions', icon: BookOpen },
  { value: 'table', label: 'Tables', icon: Table2 },
]

const defaultControls: GuideControls = {
  formats: [], // none selected by default — the user opts in
  flashcardCount: 10,
  quizCount: 5,
  splitBy: 'topic',
  difficulty: 'intermediate',
  length: 'detailed',
}

const SUGGESTIONS = [
  "Key terms as flashcards + a 5-question quiz",
  "Outline of the main topics with a summary",
  "Comparison table of the big ideas",
]

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"

export function AIAssistant({
  subject,
  gradeLevel,
  currentBlocks,
  sourceFiles,
  onContentGenerated,
  onSectionAdded,
  onGeneratingChange,
  disabled
}: AIAssistantProps) {
  const { plan, isPremium, openPremium } = usePlan()
  const [directMode, setDirectMode] = useState<DirectMode>('generic')
  const [description, setDescription] = useState("")
  const [controls, setControls] = useState<GuideControls>(defaultControls)
  const [mode, setMode] = useState<'replace' | 'add'>('add')
  const [visuals, setVisuals] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [addedTitles, setAddedTitles] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const hasExistingContent = currentBlocks.length > 0
  const hasSourceFiles = !!sourceFiles && sourceFiles.length > 0
  const selectedFormats = controls.formats ?? []
  const allFormatsSelected = selectedFormats.length === FORMAT_OPTIONS.length
  const busy = isGenerating || !!disabled

  // In specific mode we can generate from just the chosen formats (+ files);
  // in generic mode we need either a description or source files to work from.
  const canGenerate = directMode === 'specific'
    ? selectedFormats.length > 0 || hasSourceFiles || !!description.trim()
    : !!description.trim() || hasSourceFiles

  const toggleFormat = (value: GuideFormatChoice) => {
    setControls(prev => {
      const current = prev.formats ?? []
      const next = current.includes(value) ? current.filter(f => f !== value) : [...current, value]
      return { ...prev, formats: next }
    })
  }

  const setGenerating = (value: boolean) => {
    setIsGenerating(value)
    onGeneratingChange?.(value)
  }

  const handleGenerate = async () => {
    // The builder's AI is Premium; free accounts can still build by hand.
    if (plan && !isPremium) {
      openPremium({ error: "The AI assistant in the custom builder is part of Premium. You can still build guides by hand.", code: "premium_only", kind: "custom_ai" })
      return
    }
    if (!canGenerate) {
      setError(directMode === 'specific'
        ? "Pick at least one format, add a description, or upload source materials"
        : "Describe what you want, or upload source materials")
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setGenerating(true)
    setProgress("Starting…")
    setError(null)
    setAddedTitles([])

    // Tracked locally, NOT via state: the stream loop runs inside one closure,
    // so reading `sectionsAdded` state here was always 0. That made every
    // streamed section count as "first" (in Start-fresh mode each one wiped the
    // previous) and re-applied the whole guide in bulk on completion (duplicating
    // content in Add mode).
    let streamedCount = 0

    try {
      let existingContentSummary = ""
      if (mode === 'add' && hasExistingContent) {
        existingContentSummary = JSON.stringify(blocksToCustomContent(currentBlocks), null, 2)
      }

      const response = await authFetch("/api/generate-custom-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          description,
          subject,
          gradeLevel,
          existingContent: existingContentSummary,
          directContent: sourceFiles?.filter(f => f.content).map(f => ({ name: f.name, content: f.content })),
          images: sourceFiles?.flatMap(f => f.images ?? []),
          mode,
          // Structured directives only in "specific" mode; omitted = AI decides.
          controls: directMode === 'specific' ? controls : undefined,
          visuals,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (isPlanBlock(errorData)) openPremium(errorData)
        throw new Error(errorData.error || "Failed to connect to AI service")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          let data: { type: string; message?: string; section?: CustomSection; customContent?: CustomGuideContent }
          try {
            data = JSON.parse(line.slice(6))
          } catch {
            continue
          }

          switch (data.type) {
            case "progress":
              if (data.message) setProgress(data.message)
              break
            case "section":
              if (data.section && onSectionAdded) {
                onSectionAdded(data.section, mode, streamedCount === 0)
                streamedCount++
                const label = data.section.title || data.section.type
                setAddedTitles(prev => [...prev, label])
                setProgress("Writing your guide…")
              }
              break
            case "complete":
              // Sections already streamed in — only fall back to the bulk
              // payload if nothing arrived incrementally.
              if (streamedCount === 0 && data.customContent) {
                onContentGenerated(data.customContent, mode)
              }
              setDescription("")
              break
            case "error":
              setError(data.message || "Something went wrong")
              break
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setError(streamedCount > 0 ? `Stopped. Kept ${streamedCount} section${streamedCount === 1 ? "" : "s"}.` : "Generation stopped.")
      } else {
        console.error("AI generation error:", err)
        setError(err instanceof Error ? err.message : "Failed to generate content")
      }
    } finally {
      abortRef.current = null
      setGenerating(false)
      setProgress("")
    }
  }

  const genericPlaceholder = hasSourceFiles
    ? "Describe what you want, or leave blank to build a full guide from your files."
    : "e.g. Photosynthesis: an outline, key-term flashcards, and a short quiz."

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 px-4 py-3.5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 ring-1 ring-inset ring-white/25">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
              AI assistant
              {plan && !isPremium && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-300 px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wide text-amber-950"><Crown className="h-2.5 w-2.5" /> Premium</span>}
            </h3>
            <p className="text-xs text-blue-50/80">Draft blocks from a prompt or your files</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {hasSourceFiles && (
          <p className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700">
            <FileText className="h-3.5 w-3.5" />
            Using {sourceFiles!.length} uploaded file{sourceFiles!.length > 1 ? 's' : ''}
          </p>
        )}

        <Segmented
          value={directMode}
          onChange={(v) => !busy && setDirectMode(v)}
          className="grid w-full grid-cols-2"
          options={[
            { value: 'generic', label: 'Describe it', icon: Wand },
            { value: 'specific', label: 'Control it', icon: SlidersHorizontal },
          ]}
        />

        <div className="space-y-1.5">
          <label className={fieldLabel} htmlFor="ai-description">
            {directMode === 'specific' ? 'Extra instructions (optional)' : 'What should it make?'}
          </label>
          <textarea
            id="ai-description"
            placeholder={directMode === 'specific' ? "Topics to focus on, tone, anything else…" : genericPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canGenerate && !busy) {
                e.preventDefault()
                handleGenerate()
              }
            }}
            rows={4}
            disabled={busy}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
          />
          {directMode === 'generic' && !description && !isGenerating && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDescription(s)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-[0.72rem] text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {directMode === 'specific' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={fieldLabel}>Formats</span>
                <button
                  type="button"
                  onClick={() => setControls(p => ({ ...p, formats: allFormatsSelected ? [] : FORMAT_OPTIONS.map(f => f.value) }))}
                  disabled={busy}
                  className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                >
                  {allFormatsSelected ? 'Clear' : 'Select all'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMAT_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const checked = selectedFormats.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleFormat(value)}
                      disabled={busy}
                      aria-pressed={checked}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-all duration-150",
                        checked ? "border-blue-400 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {checked ? <Check className="h-3.5 w-3.5 text-blue-600" /> : <Icon className="h-3.5 w-3.5 text-slate-400" />}
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {(selectedFormats.includes('flashcards') || selectedFormats.includes('quiz')) && (
              <div className="grid grid-cols-2 gap-2">
                {selectedFormats.includes('flashcards') && (
                  <label className="space-y-1">
                    <span className={fieldLabel}>Cards / deck</span>
                    <input
                      type="number" min={1} max={50}
                      value={controls.flashcardCount ?? ''}
                      onChange={(e) => setControls(p => ({ ...p, flashcardCount: Number(e.target.value) || undefined }))}
                      disabled={busy}
                      className={selectCls}
                    />
                  </label>
                )}
                {selectedFormats.includes('quiz') && (
                  <label className="space-y-1">
                    <span className={fieldLabel}>Questions / quiz</span>
                    <input
                      type="number" min={1} max={30}
                      value={controls.quizCount ?? ''}
                      onChange={(e) => setControls(p => ({ ...p, quizCount: Number(e.target.value) || undefined }))}
                      disabled={busy}
                      className={selectCls}
                    />
                  </label>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-2 space-y-1">
                <span className={fieldLabel}>Organize</span>
                <Segmented
                  value={controls.splitBy ?? 'topic'}
                  onChange={(v) => setControls(p => ({ ...p, splitBy: v }))}
                  className="grid w-full grid-cols-2"
                  options={[{ value: 'topic', label: 'By topic' }, { value: 'single', label: 'One guide' }]}
                />
              </label>
              <label className="space-y-1">
                <span className={fieldLabel}>Difficulty</span>
                <select
                  value={controls.difficulty ?? 'intermediate'}
                  onChange={(e) => setControls(p => ({ ...p, difficulty: e.target.value as GuideControls['difficulty'] }))}
                  disabled={busy}
                  className={selectCls}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className={fieldLabel}>Length</span>
                <select
                  value={controls.length ?? 'detailed'}
                  onChange={(e) => setControls(p => ({ ...p, length: e.target.value as GuideControls['length'] }))}
                  disabled={busy}
                  className={selectCls}
                >
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {visualsRelevant({ subject: subject && subject !== 'general' ? subject : null, text: [description, ...(sourceFiles ?? []).map((f) => f.name)].join('\n'), format: 'custom' }) && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              Include visuals <VisualsInfo />
            </span>
            <Switch checked={visuals} onCheckedChange={setVisuals} disabled={busy} aria-label="Include visuals" />
          </label>
        )}

        {hasExistingContent && (
          <div className="space-y-1.5">
            <span className={fieldLabel}>Your current blocks</span>
            <Segmented
              value={mode}
              onChange={(v) => !busy && setMode(v)}
              className="grid w-full grid-cols-2"
              options={[
                { value: 'add', label: 'Add to them', icon: Plus },
                { value: 'replace', label: 'Start fresh', icon: RefreshCw },
              ]}
            />
            {mode === 'replace' && (
              <p className="text-xs text-amber-700">Replaces all {currentBlocks.length} blocks once the first section arrives.</p>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {isGenerating && (
          <div className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50">
            <div className="relative h-1 overflow-hidden bg-blue-100">
              <div className="animate-shimmer absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
            </div>
            <div className="space-y-1.5 px-3 py-2.5">
              <p className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress || "Generating…"}
              </p>
              {addedTitles.length > 0 && (
                <ul className="max-h-32 space-y-1 overflow-y-auto pl-6 text-xs text-blue-700/90">
                  {addedTitles.map((t, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="truncate">{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {isGenerating ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy || !canGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            <Wand2 className="h-4 w-4" />
            {hasExistingContent && mode === 'add' ? 'Add to guide' : 'Generate guide'}
          </button>
        )}
        {!isGenerating && canGenerate && (
          <p className="-mt-2 text-center text-[0.7rem] text-slate-400">⌘/Ctrl + Enter</p>
        )}
      </div>
    </section>
  )
}

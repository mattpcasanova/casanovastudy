"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { SUBJECTS, LEVEL_GROUPS } from '@/lib/study-options'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  Modifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useEditor, EditorProvider } from "@/lib/contexts/editor-context"
import {
  EditorBlock,
  EditorGuideMetadata,
  blocksToCustomContent,
  sectionToBlock,
  createPresetBlock,
  createEmptyBlock,
  DefinitionColorVariant,
  DefinitionBlockData,
} from "@/lib/types/editor-blocks"
import { CustomGuideContent, CustomSection } from "@/lib/types/custom-guide"
import { BlockItem, BlockGap, EditorActions } from "./block-item"
import { InsertMenu, InsertChoice, BLOCK_CATALOG } from "./insert-menu"
import { typeConfig } from "./blocks/block-wrapper"
import { DEFINITION_COLORS } from "./block-styles"
import { AIAssistant } from "./ai-assistant"
import { Segmented, ColorDots, fieldLabel } from "./editor-ui"
import CustomFormat from "@/components/formats/custom-format"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { ClientCompression } from "@/lib/client-compression"
import { deduplicateBlocks, countDuplicates } from "@/lib/deduplication"
import {
  Eye,
  PenLine,
  Save,
  RotateCcw,
  FileText,
  FileImage,
  File as FileIcon,
  Loader2,
  Upload,
  X,
  ArrowLeft,
  Plus,
  Sparkles,
  Wand2,
  Check,
  CloudOff,
  History,
  ChevronDown,
} from "lucide-react"

interface CustomGuideEditorProps {
  initialContent?: EditorBlock[]
  initialMetadata?: {
    title: string
    subject: string
    gradeLevel: string
    className?: string
  }
  onSave: (data: {
    title: string
    subject: string
    gradeLevel: string
    className?: string
    customContent: ReturnType<typeof blocksToCustomContent>
  }) => Promise<void>
  onCancel?: () => void
  isEditing?: boolean
  isTeacher?: boolean
  // localStorage key for autosaving an unsaved draft (new guides only)
  draftKey?: string
}

// Same options as the homepage generator ('general' = not specified).
const subjects = [{ value: 'general', label: 'Any subject' }, ...SUBJECTS.map((x) => ({ value: x.value, label: x.label }))]

const gradeLevels = [
  { value: 'general', label: 'Any level' },
  ...LEVEL_GROUPS.flatMap((g) => g.levels.map((l) => ({ value: l.value, label: l.label.split(' — ')[0] }))),
]

const definitionColorOptions = (Object.keys(DEFINITION_COLORS) as DefinitionColorVariant[]).map(value => ({
  value,
  label: DEFINITION_COLORS[value].label,
  swatch: DEFINITION_COLORS[value].swatch,
}))

// Vertical-only dragging (avoids the sideways drift that made reordering feel loose).
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })

function countDefinitionBlocks(blocks: EditorBlock[]): number {
  let count = 0
  for (const block of blocks) {
    if (block.type === 'definition') count++
    if (block.children) count += countDefinitionBlocks(block.children)
  }
  return count
}

function updateAllDefinitionColors(blocks: EditorBlock[], colorVariant: DefinitionColorVariant): EditorBlock[] {
  return blocks.map(block => {
    const updated = { ...block }
    if (block.type === 'definition') updated.data = { ...(block.data as DefinitionBlockData), colorVariant }
    if (block.children) updated.children = updateAllDefinitionColors(block.children, colorVariant)
    return updated
  })
}

function blockPreviewText(block: EditorBlock): string {
  if (block.title) return block.title
  const d = block.data
  switch (d.type) {
    case 'text': return d.markdown.split('\n').find(l => l.trim())?.replace(/^#+\s*/, '') || 'Empty text'
    case 'definition': return d.term || 'Untitled term'
    case 'alert': return d.title || d.message || 'Empty callout'
    case 'quiz': return `${d.questions.length} question${d.questions.length === 1 ? '' : 's'}`
    case 'flashcards': return `${d.cards.length} card${d.cards.length === 1 ? '' : 's'}`
    case 'practice': return `${d.activities.length} activit${d.activities.length === 1 ? 'y' : 'ies'}`
    case 'checklist': return `${d.items.length} item${d.items.length === 1 ? '' : 's'}`
    case 'table': return d.headers.join(' · ')
    default: return ''
  }
}

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(ts).toLocaleDateString()
}

interface SourceFile {
  name: string
  content: string
  size: number
  url?: string // Cloudinary URL - passed to AI for processing (same as home page)
}

interface StoredDraft {
  blocks: EditorBlock[]
  metadata: EditorGuideMetadata
  savedAt: number
}

// Scoped animations for the editor (block enter, subtle fade). Uses the
// independent `translate` property — NOT `transform` — so it never fights
// dnd-kit's inline transform while sorting.
const EDITOR_CSS = `
@keyframes cg-in { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: 0 0; } }
.cg-block { animation: cg-in 220ms cubic-bezier(.2,.7,.2,1) backwards; }
@keyframes cg-fade { from { opacity: 0; } to { opacity: 1; } }
.cg-fade { animation: cg-fade 200ms ease-out backwards; }
@media (prefers-reduced-motion: reduce) { .cg-block, .cg-fade { animation: none; } }
`

interface EditorContentProps extends Omit<CustomGuideEditorProps, 'initialContent'> {
  sourceFiles: SourceFile[]
  setSourceFiles: React.Dispatch<React.SetStateAction<SourceFile[]>>
}

function EditorContent({ onSave, onCancel, isEditing, isTeacher, sourceFiles, setSourceFiles, draftKey }: EditorContentProps) {
  const {
    blocks,
    selectedBlockId,
    metadata,
    isDirty,
    insertBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    moveBlock,
    reorderBlocks,
    selectBlock,
    setMetadata,
    resetEditor,
    initializeBlocks,
    appendBlocks,
    markClean,
  } = useEditor()
  const { toast, dismiss } = useToast()

  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDropping, setIsDropping] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [pendingDraft, setPendingDraft] = useState<StoredDraft | null>(null)
  const [titleError, setTitleError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const savedRef = useRef(false)

  // Latest blocks for callbacks that must stay stable (undo snapshots).
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Stable actions for memoized blocks ─────────────────────────────────────
  const insertChoice = useCallback((choice: InsertChoice, opts: { afterId?: string | null; parentId?: string; atStart?: boolean }) => {
    const block = choice.kind === 'preset' ? createPresetBlock(choice.preset) : createEmptyBlock(choice.type)
    insertBlock(block, opts)
  }, [insertBlock])

  const removeWithUndo = useCallback((id: string) => {
    const snapshot = blocksRef.current
    deleteBlock(id)
    toast({
      title: 'Block deleted',
      duration: 5000,
      action: (
        <ToastAction altText="Undo delete" onClick={() => reorderBlocks(snapshot)}>
          Undo
        </ToastAction>
      ),
    })
  }, [deleteBlock, reorderBlocks, toast])

  const actions = useMemo<EditorActions>(() => ({
    update: updateBlock,
    remove: removeWithUndo,
    duplicate: duplicateBlock,
    move: moveBlock,
    select: selectBlock,
    insert: insertChoice,
  }), [updateBlock, removeWithUndo, duplicateBlock, moveBlock, selectBlock, insertChoice])

  // ── Drag and drop ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex(b => b.id === active.id)
    const newIndex = blocks.findIndex(b => b.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) reorderBlocks(arrayMove(blocks, oldIndex, newIndex))
  }

  const activeDragBlock = activeDragId ? blocks.find(b => b.id === activeDragId) : null

  // ── Draft autosave (new guides only) ───────────────────────────────────────
  useEffect(() => {
    if (!draftKey) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as StoredDraft
      if (draft?.blocks?.length > 0) setPendingDraft(draft)
    } catch {
      // ignore unreadable drafts
    }
  }, [draftKey])

  useEffect(() => {
    if (!draftKey || !isDirty || pendingDraft) return
    const t = setTimeout(() => {
      try {
        if (blocks.length === 0 && !metadata.title.trim()) {
          localStorage.removeItem(draftKey)
          setDraftSavedAt(null)
          return
        }
        const savedAt = Date.now()
        localStorage.setItem(draftKey, JSON.stringify({ blocks, metadata, savedAt } satisfies StoredDraft))
        setDraftSavedAt(savedAt)
      } catch {
        // storage full / blocked — autosave is best-effort
      }
    }, 800)
    return () => clearTimeout(t)
  }, [blocks, metadata, isDirty, draftKey, pendingDraft])

  const clearDraft = useCallback(() => {
    if (!draftKey) return
    try { localStorage.removeItem(draftKey) } catch { /* noop */ }
    setDraftSavedAt(null)
  }, [draftKey])

  const restoreDraft = () => {
    if (!pendingDraft) return
    initializeBlocks(pendingDraft.blocks)
    setMetadata(pendingDraft.metadata)
    setDraftSavedAt(pendingDraft.savedAt)
    setPendingDraft(null)
  }

  const discardDraft = () => {
    clearDraft()
    setPendingDraft(null)
  }

  // Warn before leaving with unsaved work.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      if (savedRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Source files ───────────────────────────────────────────────────────────
  const sourceFilesForAI = sourceFiles.length > 0
    ? sourceFiles.map(f => ({ name: f.name, url: f.url, content: f.content }))
    : undefined

  const uploadSourceFiles = async (files: File[]) => {
    if (files.length === 0) return
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'text/plain'
    ]
    const allowedExtensions = ['.pdf', '.docx', '.pptx', '.ppt', '.txt']

    setIsProcessingFile(true)
    setFileError(null)

    const newFiles: SourceFile[] = []
    const errors: string[] = []

    for (const file of files) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        errors.push(`${file.name}: unsupported type (use PDF, DOCX, PPTX, or TXT)`)
        continue
      }
      if (file.size > 20 * 1024 * 1024) {
        errors.push(`${file.name}: must be under 20MB`)
        continue
      }
      if (sourceFiles.some(sf => sf.name === file.name)) {
        errors.push(`${file.name}: already added`)
        continue
      }
      try {
        // Text extraction happens server-side during AI generation (same as home page)
        const result = await ClientCompression.uploadToCloudinary(file, 'custom-guides')
        newFiles.push({ name: file.name, content: '', size: file.size, url: result.url })
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`)
      }
    }

    if (newFiles.length > 0) setSourceFiles(prev => [...prev, ...newFiles])
    if (errors.length > 0) setFileError(errors.join('\n'))
    setIsProcessingFile(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── AI results ─────────────────────────────────────────────────────────────
  const handleAIContentGenerated = (content: CustomGuideContent, mode: 'replace' | 'add') => {
    const newBlocks = content.sections.map(section => sectionToBlock(section, true))
    if (mode === 'add') appendBlocks(newBlocks, { replaceMatching: true })
    else initializeBlocks(newBlocks)
  }

  const handleSectionAdded = (section: CustomSection, mode: 'replace' | 'add', isFirst: boolean) => {
    const cleanBlock = deduplicateBlocks([sectionToBlock(section, true)])[0]
    if (!cleanBlock) return
    if (mode === 'replace' && isFirst) initializeBlocks([cleanBlock])
    else if (mode === 'replace') appendBlocks([cleanBlock])
    else appendBlocks([cleanBlock], { replaceMatching: true })
  }

  // ── Save / reset ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isSaving) return
    if (!metadata.title.trim()) {
      setTitleError(true)
      if (titleRef.current) titleRef.current.focus()
      else {
        setView('edit')
        requestAnimationFrame(() => titleRef.current?.focus())
      }
      toast({ title: 'Add a title first', description: 'Give your guide a name before saving.', variant: 'destructive' })
      return
    }
    if (blocks.length === 0) {
      toast({ title: 'Nothing to save yet', description: 'Add at least one block, or generate some with AI.', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    dismiss()
    try {
      savedRef.current = true
      await onSave({
        title: metadata.title,
        subject: metadata.subject,
        gradeLevel: metadata.gradeLevel,
        className: metadata.className || undefined,
        customContent: blocksToCustomContent(blocks, metadata)
      })
      clearDraft()
      markClean()
    } catch (error) {
      savedRef.current = false
      console.error('Save error:', error)
      toast({
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
      setIsSaving(false)
    }
  }

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // ⌘/Ctrl + S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleReset = () => {
    resetEditor()
    clearDraft()
    setSourceFiles([])
  }

  // ── Tools ──────────────────────────────────────────────────────────────────
  const definitionCount = useMemo(() => countDefinitionBlocks(blocks), [blocks])

  const handleDeduplicate = () => {
    const info = countDuplicates(blocks)
    if (info.totalDuplicates === 0) {
      toast({ title: 'No duplicates found' })
      return
    }
    reorderBlocks(deduplicateBlocks(blocks))
    const parts: string[] = []
    if (info.byType.blocks > 0) parts.push(`${info.byType.blocks} block${info.byType.blocks === 1 ? '' : 's'}`)
    if (info.byType.checklistItems > 0) parts.push(`${info.byType.checklistItems} checklist item${info.byType.checklistItems === 1 ? '' : 's'}`)
    if (info.byType.quizQuestions > 0) parts.push(`${info.byType.quizQuestions} question${info.byType.quizQuestions === 1 ? '' : 's'}`)
    toast({ title: 'Duplicates removed', description: parts.join(', ') })
  }

  // Only build the viewer payload when previewing (it used to be rebuilt on every keystroke).
  const previewContent = useMemo(
    () => (view === 'preview' ? blocksToCustomContent(blocks, metadata) : null),
    [view, blocks, metadata]
  )

  const focusAI = () => {
    const el = document.getElementById('ai-description')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ;(el as HTMLTextAreaElement | null)?.focus({ preventScroll: true })
  }

  // Header status
  const status = isSaving
    ? { icon: Loader2, text: 'Saving…', cls: 'text-slate-500', spin: true }
    : isGenerating
    ? { icon: Sparkles, text: 'AI is writing…', cls: 'text-blue-600', spin: false }
    : isDirty && draftSavedAt
    ? { icon: Check, text: `Draft saved ${timeAgo(draftSavedAt)}`, cls: 'text-slate-500', spin: false }
    : isDirty
    ? { icon: CloudOff, text: 'Unsaved changes', cls: 'text-amber-600', spin: false }
    : isEditing
    ? { icon: Check, text: 'All changes saved', cls: 'text-emerald-600', spin: false }
    : null

  const gradeOptions = gradeLevels.some(g => g.value === metadata.gradeLevel)
    ? gradeLevels
    : [{ value: metadata.gradeLevel, label: metadata.gradeLevel }, ...gradeLevels]

  const pillSelect =
    "cursor-pointer appearance-none rounded-full border border-slate-200 bg-white py-1 pl-3 pr-7 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"

  return (
    <div className={cn(displaySerif.variable, "min-h-[calc(100vh-4rem)] bg-slate-50")}>
      <style>{EDITOR_CSS}</style>

      {/* ── Sticky editor bar ─────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className={cn(fontDisplay, "truncate text-[0.95rem] font-semibold text-slate-900")}>
              {metadata.title.trim() || (isEditing ? 'Untitled guide' : 'New study guide')}
            </p>
            <p className={cn("flex h-4 items-center gap-1 text-[0.7rem]", status?.cls ?? 'text-slate-400')}>
              {status ? (
                <>
                  <status.icon className={cn("h-3 w-3", status.spin && "animate-spin")} />
                  <span className="truncate">{status.text}</span>
                </>
              ) : (
                <span className="truncate">{blocks.length} block{blocks.length === 1 ? '' : 's'}</span>
              )}
            </p>
          </div>

          <Segmented
            value={view}
            onChange={setView}
            className="hidden sm:inline-flex"
            options={[
              { value: 'edit', label: 'Edit', icon: PenLine },
              { value: 'preview', label: 'Preview', icon: Eye },
            ]}
          />
          <button
            type="button"
            onClick={() => setView(v => (v === 'edit' ? 'preview' : 'edit'))}
            aria-label={view === 'edit' ? 'Preview' : 'Edit'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 sm:hidden"
          >
            {view === 'edit' ? <Eye className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isGenerating}
            title="Save (⌘S)"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">{isEditing ? 'Save changes' : 'Save guide'}</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Canvas ────────────────────────────────────────────────────── */}
        <main className="min-w-0 space-y-4">
          {pendingDraft && (
            <div className="cg-fade flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center">
              <History className="hidden h-5 w-5 shrink-0 text-blue-600 sm:block" />
              <p className="flex-1 text-sm text-blue-900">
                You have an unsaved draft
                {pendingDraft.metadata.title ? <> — <strong>{pendingDraft.metadata.title}</strong></> : null}
                {' '}from {timeAgo(pendingDraft.savedAt)}.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={discardDraft} className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  Discard
                </button>
                <button type="button" onClick={restoreDraft} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Restore draft
                </button>
              </div>
            </div>
          )}

          {view === 'preview' ? (
            <div className="cg-fade overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 px-6 py-8 text-white sm:px-10">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-cyan-100">Preview · what students see</p>
                <h1 className={cn(fontDisplay, "mt-1 text-3xl font-semibold")}>{metadata.title.trim() || 'Untitled study guide'}</h1>
              </div>
              <div className="bg-slate-50 py-6">
                {blocks.length === 0 || !previewContent ? (
                  <div className="py-16 text-center">
                    <Eye className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-medium text-slate-700">Nothing to preview yet</p>
                    <p className="text-sm text-slate-500">Add blocks in the editor to see them here.</p>
                  </div>
                ) : (
                  <CustomFormat content={previewContent} studyGuideId="preview" />
                )}
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl bg-white px-3 pb-6 pt-8 shadow-sm ring-1 ring-slate-200 sm:px-8"
              onPointerDown={(e) => { if (e.target === e.currentTarget) selectBlock(null) }}
            >
              {/* Title + meta, edited in place */}
              <div className="px-3">
                <textarea
                  ref={titleRef}
                  rows={1}
                  value={metadata.title}
                  onChange={(e) => {
                    setMetadata({ title: e.target.value.replace(/\n/g, ' ') })
                    if (titleError) setTitleError(false)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  placeholder="Untitled study guide"
                  className={cn(
                    fontDisplay,
                    "block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-3xl font-semibold leading-tight text-slate-900 outline-none placeholder:text-slate-300 sm:text-4xl",
                    titleError && "placeholder:text-rose-300"
                  )}
                />
                {titleError && <p className="mt-1 text-sm text-rose-600">A title is required to save.</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="relative">
                    <select
                      aria-label="Subject"
                      value={metadata.subject}
                      onChange={(e) => setMetadata({ subject: e.target.value })}
                      className={pillSelect}
                    >
                      {(subjects.some(s => s.value === metadata.subject) ? subjects : [{ value: metadata.subject, label: metadata.subject }, ...subjects]).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  </span>
                  <span className="relative">
                    <select
                      aria-label="Grade level"
                      value={metadata.gradeLevel}
                      onChange={(e) => setMetadata({ gradeLevel: e.target.value })}
                      className={pillSelect}
                    >
                      {gradeOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  </span>
                  {isTeacher && (
                    <input
                      aria-label="Class (optional)"
                      value={metadata.className || ''}
                      onChange={(e) => setMetadata({ className: e.target.value })}
                      placeholder="+ Class (optional)"
                      className="w-40 rounded-full border border-dashed border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-solid focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                  )}
                </div>
              </div>

              <div className="mx-3 mb-2 mt-6 h-px bg-slate-100" />

              {blocks.length === 0 ? (
                <EmptyCanvas
                  onChoose={(choice) => insertChoice(choice, {})}
                  onUseAI={focusAI}
                  isGenerating={isGenerating}
                />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={() => setActiveDragId(null)}
                >
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div>
                      <BlockGap onChoose={(choice) => insertChoice(choice, { atStart: true })} />
                      {blocks.map(block => (
                        <div key={block.id}>
                          <BlockItem
                            block={block}
                            actions={actions}
                            isSelected={selectedBlockId === block.id}
                            selectedBlockId={block.type === 'section' ? selectedBlockId : undefined}
                          />
                          <BlockGap onChoose={(choice) => insertChoice(choice, { afterId: block.id })} />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' }}>
                    {activeDragBlock ? <DragGhost block={activeDragBlock} /> : null}
                  </DragOverlay>
                </DndContext>
              )}

              {blocks.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 px-3">
                  <InsertMenu
                    onChoose={(choice) => insertChoice(choice, {})}
                    side="top"
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Plus className="h-4 w-4" /> Add block
                      </button>
                    }
                  />
                  <span className="h-4 w-px bg-slate-200" />
                  {BLOCK_CATALOG.filter(i => i.group === 'Study formats').map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => insertChoice(item.choice, {})}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-[8.5rem] lg:max-h-[calc(100vh-9.5rem)] lg:self-start lg:overflow-y-auto lg:pb-4 lg:pr-1">
          <AIAssistant
            subject={metadata.subject}
            gradeLevel={metadata.gradeLevel}
            currentBlocks={blocks}
            sourceFiles={sourceFilesForAI}
            onContentGenerated={handleAIContentGenerated}
            onSectionAdded={handleSectionAdded}
            onGeneratingChange={setIsGenerating}
            disabled={isSaving}
          />

          {/* Source materials */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Source materials</h3>
              {sourceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setSourceFiles([]); setFileError(null) }}
                  className="text-xs font-medium text-slate-400 hover:text-rose-600"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mb-3 text-xs text-slate-500">Notes, slides, or readings for the AI to build from.</p>

            {sourceFiles.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {sourceFiles.map(file => {
                  const ext = file.name.split('.').pop()?.toLowerCase()
                  const Icon = ext === 'ppt' || ext === 'pptx' ? FileImage : ext === 'pdf' || ext === 'docx' ? FileText : FileIcon
                  const tint = ext === 'pdf' ? 'text-rose-500' : ext === 'ppt' || ext === 'pptx' ? 'text-orange-500' : ext === 'docx' ? 'text-blue-500' : 'text-slate-400'
                  return (
                    <li key={file.name} className="cg-fade group/file flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                      <Icon className={cn("h-4 w-4 shrink-0", tint)} />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.name}</span>
                      <span className="text-[0.7rem] text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button
                        type="button"
                        onClick={() => { setSourceFiles(prev => prev.filter(f => f.name !== file.name)); setFileError(null) }}
                        aria-label={`Remove ${file.name}`}
                        className="text-slate-300 transition hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.ppt,.txt"
              multiple
              onChange={(e) => uploadSourceFiles(Array.from(e.target.files ?? []))}
              className="hidden"
              disabled={isProcessingFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDropping(true) }}
              onDragLeave={() => setIsDropping(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDropping(false)
                uploadSourceFiles(Array.from(e.dataTransfer.files))
              }}
              disabled={isProcessingFile}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors",
                isDropping ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"
              )}
            >
              {isProcessingFile ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <Upload className="h-5 w-5 text-slate-400" />
              )}
              <span className="text-sm font-medium text-slate-700">
                {isProcessingFile ? 'Uploading…' : 'Drop files or browse'}
              </span>
              <span className="text-[0.7rem] text-slate-400">PDF, DOCX, PPTX, TXT · up to 20MB</span>
            </button>
            {fileError && <p className="mt-2 whitespace-pre-line text-xs text-rose-600">{fileError}</p>}
          </section>

          {/* Tools */}
          {blocks.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Tools</h3>
              <button
                type="button"
                onClick={handleDeduplicate}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <Wand2 className="h-4 w-4 text-slate-400" /> Remove duplicate content
              </button>
              {definitionCount > 0 && (
                <div className="flex items-center justify-between gap-2 px-2">
                  <span className={fieldLabel}>All definitions ({definitionCount})</span>
                  <ColorDots
                    value={'' as DefinitionColorVariant}
                    options={definitionColorOptions}
                    onChange={(c) => reorderBlocks(updateAllDefinitionColors(blocks, c))}
                  />
                </div>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-400" /> Clear everything
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear this guide?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all {blocks.length} blocks, the title, and uploaded files from the editor. {isEditing ? 'The saved guide is not changed until you save.' : ''}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleReset}>
                      Clear everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          )}

          <p className="hidden px-1 text-[0.7rem] leading-relaxed text-slate-400 lg:block">
            Tip: hover between blocks and click <span className="font-semibold text-slate-500">+</span> to insert anywhere. Drag the handle to reorder. <span className="font-semibold text-slate-500">⌘S</span> saves.
          </p>
        </aside>
      </div>
    </div>
  )
}

function EmptyCanvas({
  onChoose,
  onUseAI,
  isGenerating,
}: {
  onChoose: (choice: InsertChoice) => void
  onUseAI: () => void
  isGenerating: boolean
}) {
  if (isGenerating) {
    return (
      <div className="space-y-3 px-3 py-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="animate-pulse space-y-2 rounded-xl border border-slate-100 p-4" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
          </div>
        ))}
        <p className="text-center text-sm text-blue-600">Your guide will appear here as the AI writes it…</p>
      </div>
    )
  }

  return (
    <div className="cg-fade px-3 py-8">
      <div className="mx-auto max-w-lg text-center">
        <h3 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Start your guide</h3>
        <p className="mt-1 text-sm text-slate-500">Mix outlines, summaries, flashcards, quizzes, and practice in one place.</p>
      </div>

      <button
        type="button"
        onClick={onUseAI}
        className="group mx-auto mt-6 flex w-full max-w-lg items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 text-left transition hover:border-blue-300 hover:shadow-sm"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-blue-900">Generate with AI</span>
          <span className="block text-xs text-blue-700/80">Describe a topic or upload notes — it drafts the blocks for you</span>
        </span>
        <span className="text-blue-400 transition group-hover:translate-x-0.5">→</span>
      </button>

      <p className="mx-auto mt-6 max-w-lg text-center text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
        or start with a block
      </p>
      <div className="mx-auto mt-3 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-5">
        {BLOCK_CATALOG.filter(i => i.group === 'Study formats').map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChoose(item.choice)}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
          >
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset", item.tile)}>
              <item.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-slate-800">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <InsertMenu
          onChoose={onChoose}
          align="center"
          trigger={
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <Plus className="h-4 w-4" /> More blocks
            </button>
          }
        />
      </div>
    </div>
  )
}

// Compact floating copy shown while dragging (instead of dragging the full,
// possibly very tall block around).
function DragGhost({ block }: { block: EditorBlock }) {
  const config = typeConfig[block.type]
  const Icon = config.icon
  return (
    <div className="flex cursor-grabbing items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-2xl shadow-blue-900/15 ring-4 ring-blue-100/60">
      <Icon className={cn("h-4 w-4", config.color)} />
      <span className={cn("text-[0.68rem] font-semibold uppercase tracking-[0.12em]", config.color)}>{config.label}</span>
      <span className="truncate text-sm text-slate-700">{blockPreviewText(block)}</span>
    </div>
  )
}

export default function CustomGuideEditor({
  initialContent,
  initialMetadata,
  onSave,
  onCancel,
  isEditing,
  isTeacher,
  draftKey,
}: CustomGuideEditorProps) {
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([])

  return (
    <EditorProvider>
      <EditorInitializer initialContent={initialContent} initialMetadata={initialMetadata} />
      <EditorContent
        onSave={onSave}
        onCancel={onCancel}
        isEditing={isEditing}
        isTeacher={isTeacher}
        initialMetadata={initialMetadata}
        sourceFiles={sourceFiles}
        setSourceFiles={setSourceFiles}
        draftKey={isEditing ? undefined : draftKey}
      />
    </EditorProvider>
  )
}

// Seeds editor state once on mount (edit mode).
function EditorInitializer({
  initialContent,
  initialMetadata
}: {
  initialContent?: EditorBlock[]
  initialMetadata?: { title: string; subject: string; gradeLevel: string; className?: string }
}) {
  const { initializeBlocks, setMetadata, markClean } = useEditor()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (initialContent && initialContent.length > 0) initializeBlocks(initialContent)
    if (initialMetadata) {
      setMetadata(initialMetadata)
      // Loading an existing guide isn't an edit.
      markClean()
    }
  }, [initialContent, initialMetadata, initializeBlocks, setMetadata, markClean])

  return null
}

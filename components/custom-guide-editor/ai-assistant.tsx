"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Sparkles, ChevronDown, ChevronUp, Loader2, Wand2, Plus, RefreshCw, Wand, SlidersHorizontal, List, ScrollText, CreditCard, HelpCircle, BookOpen, Table2 } from "lucide-react"
import { CustomGuideContent, CustomSection, GuideControls, GuideFormatChoice } from "@/lib/types/custom-guide"
import { EditorBlock, blocksToCustomContent } from "@/lib/types/editor-blocks"

interface SourceFileForAI {
  name: string
  url?: string
  content?: string
}

interface AIAssistantProps {
  subject: string
  gradeLevel: string
  currentBlocks: EditorBlock[]
  sourceFiles?: SourceFileForAI[] // Files with Cloudinary URLs - processed like home page
  onContentGenerated: (content: CustomGuideContent, mode: 'replace' | 'add') => void
  onSectionAdded?: (section: CustomSection, mode: 'replace' | 'add', isFirst: boolean) => void
  disabled?: boolean
}

type DirectMode = 'generic' | 'specific'

const FORMAT_OPTIONS: { value: GuideFormatChoice; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'outline', label: 'Outline', icon: List },
  { value: 'summary', label: 'Summary', icon: ScrollText },
  { value: 'flashcards', label: 'Flashcards', icon: CreditCard },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle },
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

export function AIAssistant({
  subject,
  gradeLevel,
  currentBlocks,
  sourceFiles,
  onContentGenerated,
  onSectionAdded,
  disabled
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [directMode, setDirectMode] = useState<DirectMode>('generic')
  const [description, setDescription] = useState("")
  const [controls, setControls] = useState<GuideControls>(defaultControls)
  const [mode, setMode] = useState<'replace' | 'add'>('add')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sectionsAdded, setSectionsAdded] = useState(0)

  const hasExistingContent = currentBlocks.length > 0
  const hasSourceFiles = !!sourceFiles && sourceFiles.length > 0
  const selectedFormats = controls.formats ?? []
  const allFormatsSelected = selectedFormats.length === FORMAT_OPTIONS.length

  // In specific mode we can generate from just the chosen formats (+ files);
  // in generic mode we need either a description or source files to work from.
  const canGenerate = directMode === 'specific'
    ? selectedFormats.length > 0 || hasSourceFiles || !!description.trim()
    : !!description.trim() || hasSourceFiles

  const toggleFormat = (value: GuideFormatChoice) => {
    setControls(prev => {
      const current = prev.formats ?? []
      const next = current.includes(value)
        ? current.filter(f => f !== value)
        : [...current, value]
      return { ...prev, formats: next }
    })
  }

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError(directMode === 'specific'
        ? "Pick at least one format, add a description, or upload source materials"
        : "Describe what you want, or upload source materials")
      return
    }

    setIsGenerating(true)
    setProgress("Starting generation...")
    setError(null)
    setSectionsAdded(0)

    try {
      // Prepare existing content summary if adding
      let existingContentSummary = ""
      if (mode === 'add' && hasExistingContent) {
        const existingGuide = blocksToCustomContent(currentBlocks)
        existingContentSummary = JSON.stringify(existingGuide, null, 2)
      }

      const response = await fetch("/api/generate-custom-guide", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          subject,
          gradeLevel,
          existingContent: existingContentSummary,
          // Pass files with URLs - API will extract text (same as home page)
          cloudinaryFiles: sourceFiles?.filter(f => f.url).map(f => ({
            url: f.url,
            filename: f.name
          })),
          mode,
          // Structured directives only in "specific" mode; omitted = AI decides.
          controls: directMode === 'specific' ? controls : undefined,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to connect to AI service")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response stream")
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              switch (data.type) {
                case "progress":
                  setProgress(data.message)
                  break
                case "section":
                  // Real-time section addition
                  if (data.section && onSectionAdded) {
                    const isFirst = sectionsAdded === 0
                    onSectionAdded(data.section, mode, isFirst)
                    setSectionsAdded(prev => prev + 1)
                    setProgress(`Added section: ${data.section.title || data.section.type}`)
                  }
                  break
                case "content":
                  setProgress("Generating content...")
                  break
                case "complete":
                  // If we already sent sections incrementally, just reset the form
                  // Otherwise fall back to bulk update for compatibility
                  if (sectionsAdded > 0) {
                    setDescription("")
                    setProgress("")
                  } else if (data.customContent) {
                    onContentGenerated(data.customContent, mode)
                    setDescription("")
                    setProgress("")
                  }
                  break
                case "error":
                  setError(data.message)
                  break
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      console.error("AI generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate content")
    } finally {
      setIsGenerating(false)
      setProgress("")
    }
  }

  const genericPlaceholder = hasSourceFiles
    ? "Describe what you want — or leave blank to let AI build a full guide from your uploaded files."
    : "e.g. Create a study guide on photosynthesis with an outline, a key-terms flashcard deck, and a short quiz."

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 overflow-hidden transition-shadow ${
        !isOpen ? 'shadow-md hover:shadow-lg' : ''
      }`}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-6 py-4 cursor-pointer transition-colors">
            <div className="flex items-center gap-2 text-blue-700">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">AI Assistant</span>
              <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                Beta
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-blue-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-blue-600" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {hasSourceFiles && (
              <p className="text-sm text-blue-600 font-medium">
                AI will reference your {sourceFiles!.length} uploaded file{sourceFiles!.length > 1 ? 's' : ''}.
              </p>
            )}

            {/* Direct mode: Generic (describe / hands-off) vs Specific (structured control) */}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-1 border border-blue-100">
              <button
                type="button"
                onClick={() => setDirectMode('generic')}
                disabled={isGenerating || disabled}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  directMode === 'generic' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'
                }`}
              >
                <Wand className="h-4 w-4" />
                Describe it
              </button>
              <button
                type="button"
                onClick={() => setDirectMode('specific')}
                disabled={isGenerating || disabled}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  directMode === 'specific' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Control it
              </button>
            </div>

            {/* Description (always shown; optional in specific mode) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-blue-700">
                {directMode === 'specific' ? 'Extra instructions (optional)' : 'What do you want to study?'}
              </Label>
              <Textarea
                placeholder={directMode === 'specific'
                  ? "Anything else the AI should know? (topics to focus on, tone, etc.)"
                  : genericPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[90px] resize-y bg-white"
                disabled={isGenerating || disabled}
              />
            </div>

            {/* Specific controls */}
            {directMode === 'specific' && (
              <div className="space-y-4 rounded-lg border border-blue-100 bg-white p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-blue-700">Formats to include</Label>
                    <button
                      type="button"
                      onClick={() => setControls(p => ({
                        ...p,
                        formats: allFormatsSelected ? [] : FORMAT_OPTIONS.map(f => f.value),
                      }))}
                      disabled={isGenerating || disabled}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                    >
                      {allFormatsSelected ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FORMAT_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const checked = selectedFormats.includes(value)
                      return (
                        <label
                          key={value}
                          className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all ${
                            checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleFormat(value)}
                            disabled={isGenerating || disabled}
                            className="border-2 border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Icon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {selectedFormats.includes('flashcards') && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cards per deck (flashcards)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={controls.flashcardCount ?? ''}
                        onChange={(e) => setControls(p => ({ ...p, flashcardCount: Number(e.target.value) || undefined }))}
                        disabled={isGenerating || disabled}
                        className="bg-white"
                      />
                    </div>
                  )}
                  {selectedFormats.includes('quiz') && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Questions per quiz</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={controls.quizCount ?? ''}
                        onChange={(e) => setControls(p => ({ ...p, quizCount: Number(e.target.value) || undefined }))}
                        disabled={isGenerating || disabled}
                        className="bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Organize by</Label>
                    <Select
                      value={controls.splitBy ?? 'topic'}
                      onValueChange={(v) => setControls(p => ({ ...p, splitBy: v as GuideControls['splitBy'] }))}
                      disabled={isGenerating || disabled}
                    >
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="topic">One section per topic</SelectItem>
                        <SelectItem value="single">One combined guide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Difficulty</Label>
                    <Select
                      value={controls.difficulty ?? 'intermediate'}
                      onValueChange={(v) => setControls(p => ({ ...p, difficulty: v as GuideControls['difficulty'] }))}
                      disabled={isGenerating || disabled}
                    >
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Length</Label>
                    <Select
                      value={controls.length ?? 'detailed'}
                      onValueChange={(v) => setControls(p => ({ ...p, length: v as GuideControls['length'] }))}
                      disabled={isGenerating || disabled}
                    >
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Content mode: add vs replace */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-blue-700">Content mode</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as 'replace' | 'add')}
                className="grid grid-cols-2 gap-3"
                disabled={isGenerating || disabled}
              >
                <label
                  htmlFor="mode-add"
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all bg-white ${
                    mode === 'add' ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <RadioGroupItem value="add" id="mode-add" className="border-2 border-blue-400 text-blue-600" />
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <Plus className="h-4 w-4 text-blue-600" />
                    Add to existing
                  </div>
                </label>
                <label
                  htmlFor="mode-replace"
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all bg-white ${
                    mode === 'replace' ? 'border-blue-500 shadow-md ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <RadioGroupItem value="replace" id="mode-replace" className="border-2 border-blue-400 text-blue-600" />
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    Start fresh
                  </div>
                </label>
              </RadioGroup>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                {error}
              </p>
            )}

            {isGenerating && (
              <div className="flex items-center justify-center gap-3 py-4 px-4 bg-blue-50 rounded-lg border border-blue-200">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="text-center">
                  <span className="text-sm text-blue-700 font-medium block">{progress || "Generating content..."}</span>
                  {sectionsAdded > 0 && (
                    <span className="text-xs text-blue-600">
                      {sectionsAdded} section{sectionsAdded !== 1 ? 's' : ''} generated
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || disabled || !canGenerate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    {mode === 'add' ? 'Add Content' : 'Generate Guide'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

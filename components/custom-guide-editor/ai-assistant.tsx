"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Sparkles, ChevronDown, ChevronUp, Loader2, Wand2, Plus, RefreshCw } from "lucide-react"
import { CustomGuideContent, CustomSection } from "@/lib/types/custom-guide"
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
  const [description, setDescription] = useState("")
  const [mode, setMode] = useState<'replace' | 'add'>('add')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sectionsAdded, setSectionsAdded] = useState(0)

  const hasExistingContent = currentBlocks.length > 0

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please describe what you want in your study guide")
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

      // Debug: Log source files status
      console.log('AI Assistant - Source files status:', {
        hasSourceFiles: !!sourceFiles && sourceFiles.length > 0,
        fileCount: sourceFiles?.length || 0,
        files: sourceFiles?.map(f => ({ name: f.name, hasUrl: !!f.url }))
      })

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
          mode
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
                  // Note: We intentionally do NOT close the assistant - user can close it manually
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
            <p className="text-sm text-blue-700">
              Describe what you want and AI will help generate content.
              {sourceFiles && sourceFiles.length > 0 && (
                <span className="block mt-1 text-blue-600 font-medium">
                  AI will reference your {sourceFiles.length} uploaded file{sourceFiles.length > 1 ? 's' : ''}.
                </span>
              )}
            </p>

            <Textarea
              placeholder={sourceFiles && sourceFiles.length > 0
                ? "Example: Create sections covering the main topics from my PDF, add definitions for key terms, and include quiz questions to test understanding."
                : "Example: Create a study guide about photosynthesis with sections on light reactions, the Calvin cycle, and factors affecting photosynthesis. Include definitions for key terms, a comparison table, and practice quiz questions."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-y bg-white"
              disabled={isGenerating || disabled}
            />

            {/* Mode selection with styled buttons */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-blue-700">Content Mode</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as 'replace' | 'add')}
                className="grid grid-cols-2 gap-3"
                disabled={isGenerating || disabled}
              >
                <label
                  htmlFor="mode-add"
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all bg-white ${
                    mode === 'add'
                      ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <RadioGroupItem value="add" id="mode-add" className="border-2 border-blue-400 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <Plus className="h-4 w-4 text-blue-600" />
                      Add to existing
                    </div>
                    {hasExistingContent && (
                      <span className="text-xs text-green-600 font-medium">Recommended</span>
                    )}
                  </div>
                </label>
                <label
                  htmlFor="mode-replace"
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all bg-white ${
                    mode === 'replace'
                      ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <RadioGroupItem value="replace" id="mode-replace" className="border-2 border-blue-400 text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                      Start fresh
                    </div>
                  </div>
                </label>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                {mode === 'add'
                  ? hasExistingContent
                    ? "New content will be added after your existing blocks."
                    : "Content will be created as the starting point for your guide."
                  : "All existing content will be replaced with AI-generated content."
                }
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                {error}
              </p>
            )}

            {/* Progress indicator with spinner */}
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
                disabled={isGenerating || disabled || !description.trim()}
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

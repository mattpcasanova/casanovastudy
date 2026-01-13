"use client"

import { useState, useEffect, useRef } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEditor, EditorProvider } from "@/lib/contexts/editor-context"
import { BlockType, EditorBlock, blocksToCustomContent, sectionToBlock, DefinitionColorVariant, DefinitionBlockData } from "@/lib/types/editor-blocks"
import { CustomGuideContent, CustomSection } from "@/lib/types/custom-guide"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { BlockToolbar } from "./block-toolbar"
import { BlockWrapper } from "./blocks/block-wrapper"
import { TextBlock } from "./blocks/text-block"
import { AlertBlock } from "./blocks/alert-block"
import { TableBlock } from "./blocks/table-block"
import { QuizBlock } from "./blocks/quiz-block"
import { ChecklistBlock } from "./blocks/checklist-block"
import { DefinitionBlock } from "./blocks/definition-block"
import { SectionBlock } from "./blocks/section-block"
import { AIAssistant } from "./ai-assistant"
import CustomFormat from "@/components/formats/custom-format"
import { ClientCompression } from "@/lib/client-compression"
import { Eye, Edit3, Save, RotateCcw, FileText, FileImage, File, Loader2, Upload, X, FileUp, Palette, ChevronDown } from "lucide-react"

interface CustomGuideEditorProps {
  initialContent?: EditorBlock[]
  initialMetadata?: {
    title: string
    subject: string
    gradeLevel: string
  }
  onSave: (data: {
    title: string
    subject: string
    gradeLevel: string
    customContent: ReturnType<typeof blocksToCustomContent>
  }) => Promise<void>
  onCancel?: () => void
  isEditing?: boolean
}

const subjects = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'english', label: 'English' },
  { value: 'history', label: 'History' },
  { value: 'foreign-language', label: 'Foreign Language' },
  { value: 'other', label: 'Other' },
]

const gradeLevels = [
  { value: '6th-8th', label: '6th-8th' },
  { value: '9th', label: '9th Grade' },
  { value: '10th', label: '10th Grade' },
  { value: '11th', label: '11th Grade' },
  { value: '12th', label: '12th Grade' },
  { value: 'college', label: 'College' },
]

const definitionColorVariants: { value: DefinitionColorVariant; label: string; preview: string }[] = [
  { value: 'purple', label: 'Purple', preview: 'bg-purple-500' },
  { value: 'blue', label: 'Blue', preview: 'bg-blue-500' },
  { value: 'teal', label: 'Teal', preview: 'bg-teal-500' },
  { value: 'green', label: 'Green', preview: 'bg-green-500' },
  { value: 'pink', label: 'Pink', preview: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', preview: 'bg-orange-500' },
]

// Helper to count definition blocks (including nested in sections)
function countDefinitionBlocks(blocks: EditorBlock[]): number {
  let count = 0
  for (const block of blocks) {
    if (block.type === 'definition') count++
    if (block.children) count += countDefinitionBlocks(block.children)
  }
  return count
}

// Helper to update all definition block colors
function updateAllDefinitionColors(
  blocks: EditorBlock[],
  colorVariant: DefinitionColorVariant
): EditorBlock[] {
  return blocks.map(block => {
    const updatedBlock = { ...block }
    if (block.type === 'definition') {
      updatedBlock.data = { ...(block.data as DefinitionBlockData), colorVariant }
    }
    if (block.children) {
      updatedBlock.children = updateAllDefinitionColors(block.children, colorVariant)
    }
    return updatedBlock
  })
}

interface SourceFile {
  name: string
  content: string
  size: number
  url?: string // Cloudinary URL - passed to AI for processing (same as home page)
}

interface EditorContentProps extends Omit<CustomGuideEditorProps, 'initialContent'> {
  sourceFiles: SourceFile[]
  setSourceFiles: React.Dispatch<React.SetStateAction<SourceFile[]>>
}

function EditorContent({ onSave, onCancel, isEditing, initialMetadata, sourceFiles, setSourceFiles }: EditorContentProps) {
  const {
    blocks,
    selectedBlockId,
    metadata,
    isDirty,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    reorderBlocks,
    selectBlock,
    setMetadata,
    resetEditor,
    initializeBlocks,
    appendBlocks
  } = useEditor()

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id)
      const newIndex = blocks.findIndex((block) => block.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBlocks = arrayMove(blocks, oldIndex, newIndex)
        reorderBlocks(newBlocks)
      }
    }
  }

  // Get source files with URLs for AI processing (same flow as home page)
  const sourceFilesForAI = sourceFiles.length > 0
    ? sourceFiles.map(f => ({ name: f.name, url: f.url, content: f.content }))
    : undefined

  // Handle source file upload (multiple files) - uses Cloudinary like home page
  const handleSourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

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

    for (const file of Array.from(files)) {
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

      // Validate file type
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        errors.push(`${file.name}: Unsupported file type. Use PDF, DOCX, PPT, PPTX, or TXT.`)
        continue
      }

      // Validate file size (20MB max - same as home page)
      if (file.size > 20 * 1024 * 1024) {
        errors.push(`${file.name}: File must be less than 20MB`)
        continue
      }

      // Skip duplicates
      if (sourceFiles.some(sf => sf.name === file.name)) {
        errors.push(`${file.name}: Already uploaded`)
        continue
      }

      try {
        // Upload to Cloudinary (same as home page) - text extraction happens during AI generation
        console.log(`📤 Uploading ${file.name} to Cloudinary...`)
        const cloudinaryResult = await ClientCompression.uploadToCloudinary(file, 'custom-guides')
        console.log(`✅ Uploaded to Cloudinary:`, cloudinaryResult.url)

        // Store the URL - text will be extracted by the AI generation API (same as home page)
        newFiles.push({
          name: file.name,
          content: '', // Will be extracted during AI generation
          size: file.size,
          url: cloudinaryResult.url
        })
        console.log(`✅ File ready for AI processing: ${file.name}`)
      } catch (err) {
        console.error('File upload error:', err)
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Failed to upload'}`)
      }
    }

    if (newFiles.length > 0) {
      setSourceFiles(prev => [...prev, ...newFiles])
    }

    if (errors.length > 0) {
      setFileError(errors.join('\n'))
    }

    setIsProcessingFile(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeSourceFile = (fileName: string) => {
    setSourceFiles(prev => prev.filter(f => f.name !== fileName))
    setFileError(null)
  }

  const clearAllSourceFiles = () => {
    setSourceFiles([])
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle AI-generated content (bulk - fallback if streaming sections didn't work)
  const handleAIContentGenerated = (content: CustomGuideContent, mode: 'replace' | 'add') => {
    // Regenerate IDs for AI-generated content to avoid conflicts
    const newBlocks = content.sections.map(section => sectionToBlock(section, true))

    if (mode === 'add') {
      // Use appendBlocks with replaceMatching for quiz/checklist merging
      appendBlocks(newBlocks, { replaceMatching: true })
    } else {
      // Replace all content
      initializeBlocks(newBlocks)
    }
  }

  // Handle incremental section additions (real-time as AI generates)
  const handleSectionAdded = (section: CustomSection, mode: 'replace' | 'add', isFirst: boolean) => {
    // Pass regenerateIds=true to ensure unique IDs and avoid React key conflicts
    const newBlock = sectionToBlock(section, true)

    if (mode === 'replace' && isFirst) {
      // First section in replace mode - clear existing and start fresh
      initializeBlocks([newBlock])
    } else if (mode === 'replace') {
      // Subsequent sections in replace mode - append using functional update
      appendBlocks([newBlock])
    } else {
      // Add mode - use appendBlocks with replaceMatching for quiz/checklist merging
      // This handles cases like "add 3 questions to the quiz"
      appendBlocks([newBlock], { replaceMatching: true })
    }
  }

  const handleSave = async () => {
    if (!metadata.title.trim()) {
      alert('Please enter a title for your study guide')
      return
    }

    if (blocks.length === 0) {
      alert('Please add at least one block to your study guide')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        title: metadata.title,
        subject: metadata.subject,
        gradeLevel: metadata.gradeLevel,
        customContent: blocksToCustomContent(blocks, metadata)
      })
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save study guide. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddBlock = (type: BlockType) => {
    addBlock(type, selectedBlockId || undefined)
  }

  // Bulk update all definition colors
  const handleBulkUpdateDefinitionColors = (colorVariant: DefinitionColorVariant) => {
    const updatedBlocks = updateAllDefinitionColors(blocks, colorVariant)
    reorderBlocks(updatedBlocks) // Use reorderBlocks to update the entire block array
  }

  // Count definitions for showing/hiding the bulk actions menu
  const definitionCount = countDefinitionBlocks(blocks)

  const renderBlock = (block: EditorBlock) => {
    const isSelected = selectedBlockId === block.id

    const blockContent = () => {
      switch (block.type) {
        case 'text':
          return (
            <TextBlock
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
            />
          )
        case 'alert':
          return (
            <AlertBlock
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
            />
          )
        case 'table':
          return (
            <TableBlock
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
            />
          )
        case 'quiz':
          return (
            <QuizBlock
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
            />
          )
        case 'checklist':
          return (
            <ChecklistBlock
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
            />
          )
        case 'definition':
          return (
            <DefinitionBlock
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
            />
          )
        case 'section':
          return (
            <SectionBlock
              block={block}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onAddBlock={addBlock}
              onUpdateBlock={updateBlock}
              onDeleteBlock={deleteBlock}
              onMoveBlock={moveBlock}
              selectedBlockId={selectedBlockId}
              onSelectBlock={selectBlock}
            />
          )
        default:
          return null
      }
    }

    return (
      <BlockWrapper
        key={block.id}
        id={block.id}
        type={block.type}
        title={block.title}
        isSelected={isSelected}
        onSelect={() => selectBlock(block.id)}
        onDelete={() => deleteBlock(block.id)}
      >
        {blockContent()}
      </BlockWrapper>
    )
  }

  const previewContent = blocksToCustomContent(blocks, metadata)

  return (
    <div className="space-y-6">
      {/* Metadata Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Guide Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter study guide title..."
                value={metadata.title}
                onChange={(e) => setMetadata({ title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={metadata.subject}
                onValueChange={(value) => setMetadata({ subject: value })}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select
                value={metadata.gradeLevel}
                onValueChange={(value) => setMetadata({ gradeLevel: value })}
              >
                <SelectTrigger id="gradeLevel">
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source Material Upload */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                Source Materials (Optional)
              </Label>
              {sourceFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllSourceFiles}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Upload PDF, DOCX, PPT, PPTX, or TXT files for the AI assistant to reference when generating content.
            </p>

            {/* Uploaded files list */}
            {sourceFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {sourceFiles.map((file) => {
                  // Get file icon based on extension
                  const ext = file.name.split('.').pop()?.toLowerCase()
                  const getFileIcon = () => {
                    if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
                    if (ext === 'ppt' || ext === 'pptx') return <FileImage className="h-5 w-5 text-orange-500" />
                    if (ext === 'doc' || ext === 'docx') return <FileText className="h-5 w-5 text-blue-500" />
                    return <File className="h-5 w-5 text-gray-500" />
                  }

                  return (
                    <div
                      key={file.name}
                      className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon()}
                        <div>
                          <span className="text-sm font-medium text-gray-900">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSourceFile(file.name)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Upload button */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx,.ppt,.txt"
                multiple
                onChange={handleSourceFileUpload}
                className="hidden"
                disabled={isProcessingFile}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="w-full justify-center gap-2"
              >
                {isProcessingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing files...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {sourceFiles.length > 0 ? 'Add More Files' : 'Upload Source Materials'}
                  </>
                )}
              </Button>
            </div>

            {fileError && (
              <p className="mt-2 text-sm text-red-600 whitespace-pre-line">{fileError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant */}
      <AIAssistant
        subject={metadata.subject}
        gradeLevel={metadata.gradeLevel}
        currentBlocks={blocks}
        sourceFiles={sourceFilesForAI}
        onContentGenerated={handleAIContentGenerated}
        onSectionAdded={handleSectionAdded}
        disabled={isSaving}
      />

      {/* Editor/Preview Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="edit" className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
            )}
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={resetEditor}
              disabled={blocks.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update' : 'Create'} Guide
                </>
              )}
            </Button>
          </div>
        </div>

        <TabsContent value="edit" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <BlockToolbar onAddBlock={handleAddBlock} />

            {/* Bulk Actions dropdown - only show when there are definition blocks */}
            {definitionCount > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Palette className="h-4 w-4" />
                    Bulk Actions
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Palette className="h-4 w-4 mr-2" />
                      Change All Definition Colors
                      <span className="ml-2 text-xs text-muted-foreground">({definitionCount})</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {definitionColorVariants.map(({ value, label, preview }) => (
                        <DropdownMenuItem
                          key={value}
                          onClick={() => handleBulkUpdateDefinitionColors(value)}
                        >
                          <div className={`h-3 w-3 rounded-full ${preview} mr-2`} />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {blocks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start Building Your Study Guide
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add blocks using the toolbar above to create your custom study guide.
                </p>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {blocks.map((block) => renderBlock(block))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {blocks.length > 0 && (
            <BlockToolbar onAddBlock={handleAddBlock} />
          )}
        </TabsContent>

        <TabsContent value="preview">
          {blocks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nothing to Preview
                </h3>
                <p className="text-muted-foreground">
                  Add some blocks in the Edit tab to see a preview.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <CustomFormat content={previewContent} studyGuideId="preview" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CustomGuideEditor({
  initialContent,
  initialMetadata,
  onSave,
  onCancel,
  isEditing
}: CustomGuideEditorProps) {
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([])

  return (
    <EditorProvider>
      <EditorInitializer
        initialContent={initialContent}
        initialMetadata={initialMetadata}
      />
      <EditorContent
        onSave={onSave}
        onCancel={onCancel}
        isEditing={isEditing}
        initialMetadata={initialMetadata}
        sourceFiles={sourceFiles}
        setSourceFiles={setSourceFiles}
      />
    </EditorProvider>
  )
}

// Component to initialize editor state
function EditorInitializer({
  initialContent,
  initialMetadata
}: {
  initialContent?: EditorBlock[]
  initialMetadata?: { title: string; subject: string; gradeLevel: string }
}) {
  const { initializeBlocks, setMetadata } = useEditor()
  const initialized = useRef(false)

  // Initialize on mount (only once)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (initialContent && initialContent.length > 0) {
      initializeBlocks(initialContent)
    }
    if (initialMetadata) {
      setMetadata(initialMetadata)
    }
  }, [initialContent, initialMetadata, initializeBlocks, setMetadata])

  return null
}

"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  X,
  FileText,
  FileImage,
  File,
  Loader2,
  AlertCircle,
  GraduationCap,
  List,
  CreditCard,
  HelpCircle,
  ScrollText,
  Sparkles,
  Zap,
  Globe,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { StudyGuideData } from "@/types"

interface UploadPageProps {
  onGenerateStudyGuide: (data: StudyGuideData) => void
  isGenerating: boolean
}

export default function UploadPageRedesigned({ onGenerateStudyGuide, isGenerating }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>([])
  const [studyGuideName, setStudyGuideName] = useState("")
  const [subject, setSubject] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [format, setFormat] = useState("")
  const [topicFocus, setTopicFocus] = useState("")
  const [difficultyLevel, setDifficultyLevel] = useState("")
  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { toast } = useToast()

  const validateFile = (file: File): string | null => {
    const maxSize = 20 * 1024 * 1024 // 20MB
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!validTypes.includes(file.type)) {
      return `${file.name}: Invalid file type. Please upload PDF, PPTX, or DOCX files.`
    }

    if (file.size > maxSize) {
      return `${file.name}: File size exceeds 20MB limit.`
    }

    return null
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (newFiles: File[]) => {
    const validationErrors: string[] = []
    const validFiles: File[] = []

    newFiles.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        validationErrors.push(error)
      } else {
        validFiles.push(file)
      }
    })

    if (validationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "File validation failed",
        description: validationErrors.join("\n"),
      })
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles])
      setErrors((prev) => ({ ...prev, files: "" }))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    if (file.type.includes('presentation')) {
      return <FileImage className="h-5 w-5 text-orange-500" />
    }
    if (file.type.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-500" />
    }
    return <File className="h-5 w-5 text-gray-500" />
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (files.length === 0) {
      newErrors.files = "Please upload at least one file"
    }

    if (!studyGuideName.trim()) {
      newErrors.studyGuideName = "Please enter a name for your study guide"
    }

    if (!subject) {
      newErrors.subject = "Please select a subject"
    }

    if (!gradeLevel) {
      newErrors.gradeLevel = "Please select a grade level"
    }

    if (!format) {
      newErrors.format = "Please select a study guide format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid = files.length > 0 && studyGuideName.trim() && subject && gradeLevel && format

  const handleSubmit = () => {
    if (validateForm() && !isGenerating) {
      onGenerateStudyGuide({
        files,
        studyGuideName,
        subject,
        gradeLevel,
        format: format as 'outline' | 'flashcards' | 'quiz' | 'summary',
        topicFocus: topicFocus || undefined,
        difficultyLevel: difficultyLevel as 'beginner' | 'intermediate' | 'advanced' | undefined,
        additionalInstructions: additionalInstructions || undefined,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section - Simplified */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">
              Transform Your Materials Into
              <span className="block text-yellow-300 mt-2">Interactive Study Guides</span>
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Zap className="h-5 w-5 text-yellow-300" />
                <span className="text-white font-medium">3x faster generation</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Globe className="h-5 w-5 text-cyan-300" />
                <span className="text-white font-medium">Always accessible</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Sparkles className="h-5 w-5 text-purple-300" />
                <span className="text-white font-medium">4 interactive formats</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Upload Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upload Your Materials</h2>
              <p className="text-sm text-gray-600">PDF, PowerPoint, or Word documents</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-2xl blur-xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-8">
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  isGenerating
                    ? "opacity-50 cursor-not-allowed border-gray-300"
                    : dragActive
                    ? "border-blue-500 bg-blue-50 scale-[1.01]"
                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
                } ${errors.files ? "border-red-500 bg-red-50" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className={`h-16 w-16 mx-auto mb-4 ${dragActive ? "text-blue-500 scale-110" : "text-gray-400"} transition-all`} />
                <p className="text-lg mb-2 text-gray-900 font-medium">
                  Drag and drop your files here, or{" "}
                  <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline font-semibold">
                    browse
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.pptx,.docx"
                      onChange={handleFileInput}
                      className="hidden"
                      disabled={isGenerating}
                    />
                  </label>
                </p>
                <p className="text-sm text-gray-600">
                  Supports PDF, PowerPoint, and Word (max 20MB each)
                </p>
              </div>

              {errors.files && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.files}</AlertDescription>
                </Alert>
              )}

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Uploaded Files ({files.length})
                  </h4>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file)}
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
                        onClick={() => removeFile(index)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600"
                        disabled={isGenerating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-16"></div>

        {/* Configuration Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Configure Your Study Guide</h2>
              <p className="text-sm text-gray-600">Customize to match your learning needs</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Required Fields */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/50 to-purple-100/50 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-8">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">REQUIRED</span>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="studyGuideName" className="text-gray-900 font-semibold mb-2 block">
                      Study Guide Name
                    </Label>
                    <Input
                      id="studyGuideName"
                      placeholder="e.g., Biology Chapter 5 - Cell Structure"
                      value={studyGuideName}
                      onChange={(e) => setStudyGuideName(e.target.value)}
                      disabled={isGenerating}
                      className={`h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic ${errors.studyGuideName ? "border-red-500" : ""}`}
                    />
                    {errors.studyGuideName && <p className="text-sm text-red-600 mt-1">{errors.studyGuideName}</p>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="subject" className="text-gray-900 font-semibold mb-2 block">
                        Subject
                      </Label>
                      <Select value={subject} onValueChange={setSubject} disabled={isGenerating}>
                        <SelectTrigger className={`h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm ${errors.subject ? "border-red-500" : ""}`}>
                          <SelectValue placeholder="Select subject" className="text-gray-400 italic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mathematics">Mathematics</SelectItem>
                          <SelectItem value="science">Science</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="history">History</SelectItem>
                          <SelectItem value="foreign-language">Foreign Language</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.subject && <p className="text-sm text-red-600 mt-1">{errors.subject}</p>}
                    </div>

                    <div>
                      <Label htmlFor="grade-level" className="text-gray-900 font-semibold mb-2 block">
                        Grade Level
                      </Label>
                      <Select value={gradeLevel} onValueChange={setGradeLevel} disabled={isGenerating}>
                        <SelectTrigger className={`h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm ${errors.gradeLevel ? "border-red-500" : ""}`}>
                          <SelectValue placeholder="Select grade level" className="text-gray-400 italic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9th">9th Grade</SelectItem>
                          <SelectItem value="10th">10th Grade</SelectItem>
                          <SelectItem value="11th">11th Grade</SelectItem>
                          <SelectItem value="12th">12th Grade</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gradeLevel && <p className="text-sm text-red-600 mt-1">{errors.gradeLevel}</p>}
                    </div>
                  </div>

                  {/* Format Selection */}
                  <div>
                    <Label className="text-gray-900 font-semibold mb-4 block">
                      Study Guide Format
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { value: 'outline', icon: List, label: 'Outline', desc: 'Hierarchical with progress tracking', color: 'blue' },
                        { value: 'flashcards', icon: CreditCard, label: 'Flashcards', desc: '3D flip cards with mastery tracking', color: 'indigo' },
                        { value: 'quiz', icon: HelpCircle, label: 'Quiz', desc: 'Interactive questions with grading', color: 'purple' },
                        { value: 'summary', icon: ScrollText, label: 'Summary', desc: 'Clean reading with key terms', color: 'green' },
                      ].map(({ value, icon: Icon, label, desc, color }) => (
                        <div
                          key={value}
                          className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                            format === value
                              ? `border-${color}-500 bg-${color}-50 shadow-lg ring-2 ring-${color}-200`
                              : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                          }`}
                          onClick={() => !isGenerating && setFormat(value)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${format === value ? `bg-${color}-500` : `bg-${color}-100`}`}>
                              <Icon className={`h-5 w-5 ${format === value ? 'text-white' : `text-${color}-600`}`} />
                            </div>
                            <div>
                              <div className="font-semibold text-base text-gray-900 mb-1">{label}</div>
                              <div className="text-xs text-gray-600">{desc}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.format && <p className="text-sm text-red-600 mt-2">{errors.format}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-gray-100/50 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300 p-8">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">OPTIONAL</span>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="topic-focus" className="text-gray-700 font-medium mb-2 block">
                        Topic Focus
                      </Label>
                      <Input
                        id="topic-focus"
                        placeholder="e.g., Quadratic equations"
                        value={topicFocus}
                        onChange={(e) => setTopicFocus(e.target.value)}
                        disabled={isGenerating}
                        className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulty" className="text-gray-700 font-medium mb-2 block">
                        Difficulty Level
                      </Label>
                      <Select value={difficultyLevel} onValueChange={setDifficultyLevel} disabled={isGenerating}>
                        <SelectTrigger className="h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm">
                          <SelectValue placeholder="Select difficulty" className="text-gray-400 italic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="instructions" className="text-gray-700 font-medium mb-2 block">
                      Additional Instructions
                    </Label>
                    <Textarea
                      id="instructions"
                      placeholder="Any specific requirements or preferences..."
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      rows={4}
                      disabled={isGenerating}
                      className="resize-none text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Generate Button - Blue */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur-2xl opacity-30"></div>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isGenerating}
            className="relative w-full h-16 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]"
          >
            {isGenerating ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Generating Your Study Guide...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6" />
                Generate Study Guide
                <Sparkles className="h-5 w-5" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

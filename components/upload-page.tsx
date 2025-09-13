"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { StudyGuideData } from "@/app/page"

interface UploadPageProps {
  onGenerateStudyGuide: (data: StudyGuideData) => void
  isGenerating: boolean
}

export default function UploadPage({ onGenerateStudyGuide, isGenerating }: UploadPageProps) {
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
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if (!allowedTypes.includes(file.type)) {
      return "File type not supported. Please upload PDF, PowerPoint, or Word documents."
    }

    if (file.size > maxSize) {
      return "File size too large. Please upload files smaller than 20MB (PDFs over 10MB will be compressed)."
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

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }

  const addFiles = (newFiles: File[]) => {
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    newFiles.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        invalidFiles.push(`${file.name}: ${error}`)
      } else {
        // Warn about Vercel limits but allow locally
        if (file.size > 4.5 * 1024 * 1024) {
          console.warn(`File ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) may not work on live deployment due to Vercel's 4.5MB limit`)
        }
        validFiles.push(file)
      }
    })

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles])
      toast({
        title: "Files added successfully",
        description: `${validFiles.length} file(s) added to your upload.`,
      })
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "Some files couldn't be added",
        description: invalidFiles[0], // Show first error
        variant: "destructive",
      })
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    toast({
      title: "File removed",
      description: "File has been removed from your upload.",
    })
  }

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />
    if (file.type.includes("presentation")) return <FileImage className="h-4 w-4 text-orange-500" />
    return <File className="h-4 w-4 text-blue-500" />
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
        format,
        topicFocus: topicFocus || undefined,
        difficultyLevel: difficultyLevel || undefined,
        additionalInstructions: additionalInstructions || undefined,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-3xl cursor-pointer">
              <img src="/images/casanova-study-logo.png" alt="CasanovaStudy Logo" className="h-30 w-48" />
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-8 mx-auto max-w-4xl">
            <p className="text-xl text-center text-white text-pretty leading-relaxed">
              Transform your course materials into personalized study guides with smart learning assistance
            </p>
          </div>

          <div className="flex justify-center mt-10">
            <div className="flex items-center gap-8 text-sm text-white/90 bg-black/10 px-8 py-4 rounded-full backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="font-medium">PDF Support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Multiple Formats</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Smart</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl text-foreground flex items-center gap-3">
                <Upload className="h-6 w-6 text-primary" />
                Upload Your Materials
              </CardTitle>
              <p className="text-muted-foreground text-pretty">
                Upload your course materials and we'll transform them into effective study guides
              </p>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                } ${errors.files ? "border-destructive bg-destructive/5" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`transition-transform duration-300 ${dragActive ? "scale-110" : ""}`}>
                  <Upload
                    className={`h-16 w-16 mx-auto mb-6 transition-colors duration-300 ${
                      dragActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <p className="text-lg mb-3 text-foreground font-medium">
                  Drag and drop your files here, or{" "}
                  <label className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2 font-semibold transition-colors duration-200">
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
                <p className="text-sm text-muted-foreground">
                  Supports PDF, PowerPoint, and Word documents (max 20MB each)
                  <br />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    PDFs over 10MB will be automatically compressed (typically 60-80% size reduction)
                  </span>
                </p>
              </div>

              {errors.files && (
                <Alert variant="destructive" className="mt-4 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.files}</AlertDescription>
                </Alert>
              )}

              {files.length > 0 && (
                <div className="mt-6 space-y-3 animate-in slide-in-from-bottom-4 duration-500">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Uploaded Files ({files.length})
                  </h4>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border transition-all duration-200 hover:bg-muted/80 hover:shadow-md group"
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(file)}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-red-500 hover:bg-gray-200 transition-colors duration-200"
                          disabled={isGenerating}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl text-foreground flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-primary" />
                Configure Your Study Guide
              </CardTitle>
              <p className="text-muted-foreground text-pretty">
                Customize your study guide to match your learning preferences and academic level
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Required Fields */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">Required Information</h3>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="studyGuideName" className="text-foreground font-medium">
                    Study Guide Name *
                  </Label>
                  <Input
                    id="studyGuideName"
                    type="text"
                    placeholder="e.g., Density and Pressure Review, Biology Chapter 5, etc."
                    value={studyGuideName}
                    onChange={(e) => setStudyGuideName(e.target.value)}
                    disabled={isGenerating}
                    className={`transition-all duration-200 border-2 ${errors.studyGuideName ? "border-destructive" : "border-border hover:border-primary/70 focus:border-primary"}`}
                  />
                  {errors.studyGuideName && (
                    <p className="text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
                      {errors.studyGuideName}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="subject" className="text-foreground font-medium">
                      Subject *
                    </Label>
                    <Select value={subject} onValueChange={setSubject} disabled={isGenerating}>
                      <SelectTrigger
                        className={`transition-all duration-200 border-2 ${errors.subject ? "border-destructive" : "border-border hover:border-primary/70 focus:border-primary"}`}
                      >
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mathematics">📐 Mathematics</SelectItem>
                        <SelectItem value="science">🔬 Science</SelectItem>
                        <SelectItem value="english">📚 English</SelectItem>
                        <SelectItem value="history">🏛️ History</SelectItem>
                        <SelectItem value="foreign-language">🌍 Foreign Language</SelectItem>
                        <SelectItem value="other">📝 Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.subject && (
                      <p className="text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="grade-level" className="text-foreground font-medium">
                      Grade Level *
                    </Label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel} disabled={isGenerating}>
                      <SelectTrigger
                        className={`transition-all duration-200 border-2 ${errors.gradeLevel ? "border-destructive" : "border-border hover:border-primary/70 focus:border-primary"}`}
                      >
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9th">9th Grade</SelectItem>
                        <SelectItem value="10th">10th Grade</SelectItem>
                        <SelectItem value="11th">11th Grade</SelectItem>
                        <SelectItem value="12th">12th Grade</SelectItem>
                        <SelectItem value="college">🎓 College</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gradeLevel && (
                      <p className="text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
                        {errors.gradeLevel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-foreground font-medium">Study Guide Format *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`cursor-pointer rounded-lg border-2 transition-all duration-200 hover:bg-muted/50 hover:border-primary/70 h-20 min-w-0 ${
                        format === "outline" ? "border-primary bg-primary/5 shadow-md" : "border-border"
                      }`}
                      onClick={() => setFormat("outline")}
                    >
                      <div className="flex items-center space-x-3 p-4 h-full">
                        <List className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">Outline</div>
                          <div className="text-xs text-muted-foreground">Structured topic breakdown</div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`cursor-pointer rounded-lg border-2 transition-all duration-200 hover:bg-muted/50 hover:border-primary/70 h-20 min-w-0 ${
                        format === "flashcards" ? "border-primary bg-primary/5 shadow-md" : "border-border"
                      }`}
                      onClick={() => setFormat("flashcards")}
                    >
                      <div className="flex items-center space-x-3 p-4 h-full">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">Flashcards</div>
                          <div className="text-xs text-muted-foreground">Question and answer cards</div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`cursor-pointer rounded-lg border-2 transition-all duration-200 hover:bg-muted/50 hover:border-primary/70 h-20 min-w-0 ${
                        format === "quiz" ? "border-primary bg-primary/5 shadow-md" : "border-border"
                      }`}
                      onClick={() => setFormat("quiz")}
                    >
                      <div className="flex items-center space-x-3 p-4 h-full">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">Quiz</div>
                          <div className="text-xs text-muted-foreground">Practice questions</div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`cursor-pointer rounded-lg border-2 transition-all duration-200 hover:bg-muted/50 hover:border-primary/70 h-20 min-w-0 ${
                        format === "summary" ? "border-primary bg-primary/5 shadow-md" : "border-border"
                      }`}
                      onClick={() => setFormat("summary")}
                    >
                      <div className="flex items-center space-x-3 p-4 h-full">
                        <ScrollText className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">Summary</div>
                          <div className="text-xs text-muted-foreground">Key points overview</div>
                        </div>
                      </div>
                    </div>

                  </div>
                  {errors.format && (
                    <p className="text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
                      {errors.format}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Fields */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-accent rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">Optional Customization</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="topic-focus" className="text-foreground font-medium">
                      Topic Focus
                    </Label>
                    <Input
                      id="topic-focus"
                      placeholder="e.g., Quadratic equations"
                      value={topicFocus}
                      onChange={(e) => setTopicFocus(e.target.value)}
                      disabled={isGenerating}
                      className="transition-all duration-200 border-2 border-border hover:border-primary/70 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="difficulty" className="text-foreground font-medium">
                      Difficulty Level
                    </Label>
                    <Select value={difficultyLevel} onValueChange={setDifficultyLevel} disabled={isGenerating}>
                      <SelectTrigger className="transition-all duration-200 border-2 border-border hover:border-primary/70 focus:border-primary">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">🌱 Beginner</SelectItem>
                        <SelectItem value="intermediate">🌿 Intermediate</SelectItem>
                        <SelectItem value="advanced">🌳 Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="instructions" className="text-foreground font-medium">
                    Additional Instructions
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder="Any specific requirements or preferences..."
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    rows={4}
                    disabled={isGenerating}
                    className="transition-all duration-200 border-2 border-border hover:border-primary/70 focus:border-primary resize-none"
                  />
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isGenerating}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl"
                  size="lg"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Generating Your Study Guide...</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Generate Study Guide
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

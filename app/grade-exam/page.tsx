"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, X, CheckCircle, Download, FileCheck, AlertCircle, Edit2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { StreamingGenerationProgress } from "@/components/generation-progress"
import NavigationHeader from "@/components/navigation-header"
import { AutocompleteInput } from "@/components/autocomplete-input"
import { useAuth } from "@/lib/auth"
import { processFile } from "@/lib/pdf-to-images"

interface GradingResult {
  id?: string
  pdfUrl: string
  pdfDataUrl?: string
  totalMarks: number
  totalPossibleMarks: number
  gradeBreakdown: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }>
  fullResponse?: string
}

export default function GradeExamPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [answerSheetFile, setAnswerSheetFile] = useState<File | null>(null)
  const [studentExamFiles, setStudentExamFiles] = useState<File[]>([])
  const [additionalComments, setAdditionalComments] = useState<string>("")
  const [isGrading, setIsGrading] = useState(false)
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [gradingContent, setGradingContent] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

  // Editing state for teachers
  const [editedBreakdown, setEditedBreakdown] = useState<GradingResult['gradeBreakdown'] | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false)
  const [answerSheetDragActive, setAnswerSheetDragActive] = useState(false)

  // Optional metadata fields for organization
  const [studentFirstName, setStudentFirstName] = useState("")
  const [studentLastName, setStudentLastName] = useState("")
  const [className, setClassName] = useState("")
  const [classPeriod, setClassPeriod] = useState("")
  const [examTitle, setExamTitle] = useState("")

  const { toast } = useToast()

  // Conditional text based on user type
  const isTeacher = user?.user_type === 'teacher'
  const pageTitle = isTeacher ? 'Exam Grading Assistant' : 'Check My Work'
  const pageSubtitle = isTeacher
    ? 'Upload student exams to receive detailed grading with marks and feedback'
    : 'Upload your practice work to get helpful feedback and improve your understanding'

  // Initialize edited breakdown when results arrive
  useEffect(() => {
    if (gradingResult && isTeacher) {
      setEditedBreakdown(gradingResult.gradeBreakdown)
    }
  }, [gradingResult, isTeacher])

  const validateFile = (file: File): string | null => {
    const maxSize = 100 * 1024 * 1024 // 100MB - PDFs are converted to compressed images before upload
    const allowedDocTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain"
    ]
    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ]
    const allowedExtensions = ['pdf', 'docx', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

    const extension = file.name.split('.').pop()?.toLowerCase()
    const isValidType = allowedDocTypes.includes(file.type) || allowedImageTypes.includes(file.type)
    const isValidExtension = extension && allowedExtensions.includes(extension)

    if (!isValidType && !isValidExtension) {
      return "Only PDF, DOCX, PPTX, TXT, JPG, PNG, HEIC, or WebP files are supported."
    }
    if (file.size > maxSize) {
      return "File size too large. Please upload files smaller than 100MB"
    }
    return null
  }

  const handleAnswerSheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const error = validateFile(file)
      if (error) {
        toast({
          title: "Invalid file",
          description: error,
          variant: "destructive",
        })
        return
      }
      setAnswerSheetFile(file)
      setErrors((prev) => ({ ...prev, answerSheet: "" }))
      toast({
        title: "Answer sheet uploaded",
        description: `${file.name} has been uploaded successfully.`,
      })
    }
  }

  const handleStudentExamUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      const validFiles: File[] = []
      const invalidFiles: string[] = []

      for (const file of newFiles) {
        const error = validateFile(file)
        if (error) {
          invalidFiles.push(`${file.name}: ${error}`)
        } else {
          validFiles.push(file)
        }
      }

      if (invalidFiles.length > 0) {
        toast({
          title: `${invalidFiles.length} file(s) skipped`,
          description: invalidFiles[0],
          variant: "destructive",
        })
      }

      if (validFiles.length > 0) {
        setStudentExamFiles(prev => [...prev, ...validFiles])
        setErrors((prev) => ({ ...prev, studentExam: "" }))
        toast({
          title: `${validFiles.length} file(s) added`,
          description: validFiles.length === 1
            ? validFiles[0].name
            : `Total: ${studentExamFiles.length + validFiles.length} files`,
        })
      }

      // Reset input so same file can be added again if removed
      e.target.value = ''
    }
  }

  const removeAnswerSheet = () => {
    setAnswerSheetFile(null)
    toast({
      title: "Answer sheet removed",
      description: "Answer sheet file has been removed.",
    })
  }

  const removeStudentExam = (index?: number) => {
    if (index !== undefined) {
      const removedFile = studentExamFiles[index]
      setStudentExamFiles(prev => prev.filter((_, i) => i !== index))
      toast({
        title: "File removed",
        description: `${removedFile.name} has been removed.`,
      })
    } else {
      setStudentExamFiles([])
      toast({
        title: "All files removed",
        description: "All student exam files have been removed.",
      })
    }
  }

  // Drag and drop handlers
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

    if (isGrading) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    for (const file of droppedFiles) {
      const error = validateFile(file)
      if (error) {
        invalidFiles.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }

    if (invalidFiles.length > 0) {
      toast({
        title: `${invalidFiles.length} file(s) skipped`,
        description: invalidFiles[0],
        variant: "destructive",
      })
    }

    if (validFiles.length > 0) {
      setStudentExamFiles(prev => [...prev, ...validFiles])
      setErrors(prev => ({ ...prev, studentExam: "" }))
      toast({
        title: `${validFiles.length} file(s) added`,
        description: validFiles.length === 1
          ? validFiles[0].name
          : `Total: ${studentExamFiles.length + validFiles.length} files`,
      })
    }
  }

  // Answer sheet drag and drop handlers
  const handleAnswerSheetDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setAnswerSheetDragActive(true)
    } else if (e.type === "dragleave") {
      setAnswerSheetDragActive(false)
    }
  }

  const handleAnswerSheetDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAnswerSheetDragActive(false)

    if (isGrading) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    const file = droppedFiles[0] // Only take first file for answer sheet
    const error = validateFile(file)

    if (error) {
      toast({
        title: "Invalid file",
        description: error,
        variant: "destructive",
      })
      return
    }

    setAnswerSheetFile(file)
    setErrors(prev => ({ ...prev, answerSheet: "" }))
    toast({
      title: "Answer sheet uploaded",
      description: `${file.name} has been uploaded successfully.`,
    })
  }

  const handleGradeExam = async () => {
    // Validate - only student exam is required
    const newErrors: Record<string, string> = {}
    if (studentExamFiles.length === 0) {
      newErrors.studentExam = "Please upload a student exam"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast({
        title: "Missing files",
        description: "Please upload the student exam.",
        variant: "destructive",
      })
      return
    }

    setIsGrading(true)
    setGradingResult(null)
    setGradingContent("")
    setStatusMessage("Processing exam files...")
    setErrors({})

    try {
      // Process files: convert PDFs to images and compress large images
      let processedMarkScheme: File[] = []
      let processedStudentExams: File[] = []

      // Process mark scheme if provided
      if (answerSheetFile) {
        setStatusMessage("Processing mark scheme...")
        processedMarkScheme = await processFile(answerSheetFile, setStatusMessage)
      }

      // Process all student exam files
      for (let i = 0; i < studentExamFiles.length; i++) {
        setStatusMessage(`Processing student exam file ${i + 1} of ${studentExamFiles.length}...`)
        const processed = await processFile(studentExamFiles[i], setStatusMessage)
        processedStudentExams.push(...processed)
      }

      setStatusMessage("Sending to grading service...")

      // Create FormData with processed files
      const formData = new FormData()
      // Append processed mark scheme files (now images)
      for (const file of processedMarkScheme) {
        formData.append("markScheme", file)
      }
      // Append all processed student exam files (now images)
      for (const file of processedStudentExams) {
        formData.append("studentExam", file)
      }
      if (additionalComments.trim()) {
        formData.append("additionalComments", additionalComments.trim())
      }
      // Pass userId for authentication (needed because client uses localStorage, not cookies)
      if (user?.id) {
        formData.append("userId", user.id)
      }
      // Pass original filename (before PDF-to-image conversion) for proper naming
      const originalFilenames = studentExamFiles.map(f => f.name).join(', ')
      formData.append("originalFilename", originalFilenames)
      // Pass optional metadata fields
      if (studentFirstName.trim()) formData.append("studentFirstName", studentFirstName.trim())
      if (studentLastName.trim()) formData.append("studentLastName", studentLastName.trim())
      if (className.trim()) formData.append("className", className.trim())
      if (classPeriod.trim()) formData.append("classPeriod", classPeriod.trim())
      if (examTitle.trim()) formData.append("examTitle", examTitle.trim())

      // Use streaming endpoint for teachers
      if (isTeacher) {
        const response = await fetch("/api/grade-exam-stream", {
          method: "POST",
          credentials: "include",
          body: formData,
        })

        if (!response.ok) {
          // Try to get error details from response
          let errorMessage = "Failed to start grading"
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch {
            // Response might not be JSON
            if (response.status === 413) {
              errorMessage = "File too large. Try reducing the number of pages or image quality."
            } else if (response.status === 504 || response.status === 502) {
              errorMessage = "Server timeout. The grading is taking too long. Try with fewer pages."
            } else if (response.status === 500) {
              errorMessage = "Server error. Please try again in a moment."
            }
          }
          throw new Error(errorMessage)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("Failed to read response stream")
        }

        let buffer = ''
        let receivedComplete = false
        let lastError: Error | null = null
        const startTime = Date.now()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'error') {
                lastError = new Error(data.message)
              }

              if (data.type === 'progress') {
                setStatusMessage(data.message)
              }

              if (data.type === 'content') {
                setGradingContent(prev => prev + data.chunk)
              }

              if (data.type === 'complete') {
                receivedComplete = true
                setStatusMessage("Grading complete!")
                toast({
                  title: "Grading complete!",
                  description: `Exam graded successfully. Total: ${data.totalMarks}/${data.totalPossibleMarks} marks.`,
                })

                // Redirect to persistent grade report page if we have an ID
                if (data.id) {
                  router.push(`/grade-report/${data.id}`)
                } else {
                  // Fall back to showing result inline if no ID
                  setGradingResult({
                    totalMarks: data.totalMarks,
                    totalPossibleMarks: data.totalPossibleMarks,
                    gradeBreakdown: data.gradeBreakdown,
                    pdfUrl: '',
                  })
                }
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError)
            }
          }
        }

        // If stream closed without completing, determine the cause
        if (!receivedComplete) {
          if (lastError) {
            throw lastError
          }

          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)

          // Check for common timeout scenarios
          if (elapsedSeconds < 15) {
            // Stream closed too quickly - likely a server error or bad request
            throw new Error("Connection closed unexpectedly. The server may have encountered an error processing the files.")
          } else if (elapsedSeconds >= 55 && elapsedSeconds <= 65) {
            // Around 60 seconds - likely Vercel Pro timeout
            throw new Error("Grading timed out after ~60 seconds. Try reducing the number of pages or contact support if this persists.")
          } else if (elapsedSeconds >= 9 && elapsedSeconds <= 12) {
            // Around 10 seconds - likely Vercel Hobby timeout
            throw new Error("Grading timed out. Your Vercel plan may not support long-running functions. Consider upgrading to Vercel Pro for exam grading.")
          } else {
            throw new Error(`Grading was interrupted after ${elapsedSeconds} seconds. Please try again.`)
          }
        }
      } else {
        // Non-streaming fallback for students
        setStatusMessage("Grading exam...")
        const response = await fetch("/api/grade-exam", {
          method: "POST",
          credentials: "include",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage = errorData.error || "Failed to grade exam"
          throw new Error(errorMessage)
        }

        const result = await response.json()
        setGradingResult(result.data)
        setStatusMessage("Grading complete!")

        toast({
          title: "Grading complete!",
          description: `Exam graded successfully. Total: ${result.data.totalMarks}/${result.data.totalPossibleMarks} marks.`,
        })

        // Redirect to persistent grade report page if we have an ID
        if (result.data.id) {
          router.push(`/grade-report/${result.data.id}`)
        }
      }
    } catch (error) {
      console.error("Grading error:", error)
      toast({
        title: "Grading failed",
        description: error instanceof Error ? error.message : "An error occurred while grading the exam.",
        variant: "destructive",
      })
    } finally {
      setIsGrading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation Header */}
      <NavigationHeader
        user={user}
        onSignOut={signOut}
      />

      {/* Hero Section - Matching Home Page Style */}
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
              {pageTitle}
            </h1>
            <p className="text-lg opacity-90">
              {pageSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {!isGrading && !gradingResult && (
          <>
            {/* Upload Section */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
                  <p className="text-sm text-gray-600">Student exam and optional answer sheet</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-8 space-y-6">
                  {/* Student Exam Upload */}
                  <div className="space-y-3">
                    <Label htmlFor="studentExam" className="text-gray-900 font-semibold flex items-center gap-2">
                      Student Exam * {studentExamFiles.length > 0 && <span className="text-xs text-gray-500 font-normal">({studentExamFiles.length} file{studentExamFiles.length !== 1 ? 's' : ''})</span>}
                    </Label>

                    {/* Upload area with drag-and-drop */}
                    <div
                      className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                        isGrading
                          ? "opacity-50 cursor-not-allowed border-gray-300"
                          : dragActive
                          ? "border-blue-500 bg-blue-50 scale-[1.01]"
                          : errors.studentExam
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
                      }`}
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
                            id="studentExam"
                            accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif"
                            onChange={handleStudentExamUpload}
                            className="hidden"
                            disabled={isGrading}
                            multiple
                          />
                        </label>
                      </p>
                      <p className="text-sm text-gray-600">
                        PDF, DOCX, images (JPG, PNG, HEIC) - Max 100MB per file
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        For handwritten exams: upload multiple page photos
                      </p>
                    </div>
                    {errors.studentExam && (
                      <p className="text-sm text-red-600 animate-in slide-in-from-top-1">
                        {errors.studentExam}
                      </p>
                    )}

                    {/* Show uploaded files list */}
                    {studentExamFiles.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {studentExamFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all group">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStudentExam(index)}
                              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-600"
                              disabled={isGrading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Answer Sheet Upload */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="answerSheet" className="text-gray-900 font-semibold">
                        Answer Sheet (Optional but Recommended)
                      </Label>
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-sm text-gray-600 -mt-1">
                      Providing an answer sheet helps ensure accurate grading and detailed feedback
                    </p>
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                        isGrading
                          ? "opacity-50 cursor-not-allowed border-gray-300"
                          : answerSheetDragActive
                          ? "border-blue-500 bg-blue-50 scale-[1.01]"
                          : errors.answerSheet
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
                      }`}
                      onDragEnter={handleAnswerSheetDrag}
                      onDragLeave={handleAnswerSheetDrag}
                      onDragOver={handleAnswerSheetDrag}
                      onDrop={handleAnswerSheetDrop}
                    >
                      {answerSheetFile ? (
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-green-500" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{answerSheetFile.name}</span>
                              <span className="text-xs text-gray-500">
                                {(answerSheetFile.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeAnswerSheet}
                            className="text-gray-500 hover:text-red-600"
                            disabled={isGrading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className={`h-12 w-12 mx-auto mb-4 ${answerSheetDragActive ? "text-blue-500 scale-110" : "text-gray-400"} transition-all`} />
                          <p className="text-base mb-2 text-gray-900 font-medium">
                            Drag and drop your answer sheet here, or{" "}
                            <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline font-semibold">
                              browse
                              <input
                                type="file"
                                id="answerSheet"
                                accept=".pdf,.docx,.pptx,.txt"
                                onChange={handleAnswerSheetUpload}
                                className="hidden"
                                disabled={isGrading}
                              />
                            </label>
                          </p>
                          <p className="text-sm text-gray-600">PDF, DOCX, PPTX, or TXT format (max 100MB)</p>
                        </>
                      )}
                    </div>
                    {errors.answerSheet && (
                      <p className="text-sm text-red-600 animate-in slide-in-from-top-1">
                        {errors.answerSheet}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-16"></div>

            {/* Additional Options Section */}
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Additional Options</h2>
                  <p className="text-sm text-gray-600">Customize grading instructions and report details</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Grading Instructions */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/50 to-purple-100/50 rounded-2xl blur-xl"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">GRADING INSTRUCTIONS</span>
                    </div>
                    <Label htmlFor="additionalComments" className="text-gray-900 font-semibold mb-2 block">
                      Instructions for the Grader (Optional)
                    </Label>
                    <Textarea
                      id="additionalComments"
                      placeholder="Add specific instructions for the grader (e.g., 'Be lenient on Question 3', 'Focus on application skills', etc.)"
                      value={additionalComments}
                      onChange={(e) => setAdditionalComments(e.target.value)}
                      rows={4}
                      disabled={isGrading}
                      className="resize-none text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      These instructions guide the grader but won't appear in the report
                    </p>
                  </div>
                </div>

                {/* Optional Metadata Fields for Organization */}
                {isTeacher && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-gray-100/50 rounded-2xl blur-xl"></div>
                    <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300 p-8">
                      <div className="flex items-center gap-2 mb-6">
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">OPTIONAL</span>
                        <span className="text-sm text-gray-600">Report details - helps organize your reports</span>
                      </div>

                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="studentFirstName" className="text-gray-700 font-medium">Student First Name</Label>
                            <AutocompleteInput
                              id="studentFirstName"
                              placeholder="e.g., John"
                              value={studentFirstName}
                              onChange={setStudentFirstName}
                              disabled={isGrading}
                              className="h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm"
                              fieldName="studentFirstName"
                              userId={user?.id}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="studentLastName" className="text-gray-700 font-medium">Student Last Name</Label>
                            <AutocompleteInput
                              id="studentLastName"
                              placeholder="e.g., Smith"
                              value={studentLastName}
                              onChange={setStudentLastName}
                              disabled={isGrading}
                              className="h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm"
                              fieldName="studentLastName"
                              userId={user?.id}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="examTitle" className="text-gray-700 font-medium">Exam Title</Label>
                          <AutocompleteInput
                            id="examTitle"
                            placeholder="e.g., Chapter 3 Test, Midterm Exam"
                            value={examTitle}
                            onChange={setExamTitle}
                            disabled={isGrading}
                            className="h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm"
                            userId={user?.id}
                            fieldName="examTitle"
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="className" className="text-gray-700 font-medium">Class</Label>
                            <AutocompleteInput
                              id="className"
                              placeholder="e.g., AP Biology, Marine Science"
                              value={className}
                              onChange={setClassName}
                              disabled={isGrading}
                              className="h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm"
                              fieldName="className"
                              userId={user?.id}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="classPeriod" className="text-gray-700 font-medium">Period</Label>
                            <AutocompleteInput
                              id="classPeriod"
                              placeholder="e.g., 1, 2A, Morning"
                              value={classPeriod}
                              onChange={setClassPeriod}
                              disabled={isGrading}
                              className="h-12 bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm"
                              fieldName="classPeriod"
                              userId={user?.id}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Grade Button */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur-2xl opacity-30"></div>
              <Button
                onClick={handleGradeExam}
                disabled={studentExamFiles.length === 0 || isGrading}
                className="relative w-full h-16 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="h-6 w-6" />
                  Grade Exam {studentExamFiles.length > 1 && `(${studentExamFiles.length} pages)`}
                </div>
              </Button>
            </div>
          </>
        )}

        {/* Loading State - Use StreamingGenerationProgress */}
        {isGrading && (
          <StreamingGenerationProgress
            content={gradingContent}
            statusMessage={statusMessage}
            isComplete={false}
            loadingText="Grading exam..."
            completeText="Exam graded successfully!"
          />
        )}

        {/* Results Section */}
        {gradingResult && !isGrading && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Grading Complete</h2>
                <p className="text-sm text-gray-600">Review the results below</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-100/50 to-blue-100/50 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-8 space-y-6 animate-in slide-in-from-bottom-4">
                {/* Summary */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Total Score</h3>
                  </div>
                  <p className="text-4xl font-bold text-green-600">
                    {gradingResult.totalMarks} / {gradingResult.totalPossibleMarks} marks
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {((gradingResult.totalMarks / gradingResult.totalPossibleMarks) * 100).toFixed(1)}%
                  </p>
                </div>

                {/* Grade Breakdown */}
                {gradingResult.gradeBreakdown && gradingResult.gradeBreakdown.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Question Breakdown</h3>
                      {/* Edit button for teachers only */}
                      {isTeacher && !isEditing && (
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          size="sm"
                          className="border-gray-300"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Feedback
                        </Button>
                      )}
                      {isTeacher && isEditing && (
                        <Button
                          onClick={() => setIsEditing(false)}
                          variant="outline"
                          size="sm"
                          className="border-gray-300"
                        >
                          Cancel Editing
                        </Button>
                      )}
                    </div>

                    {/* Editing Mode for Teachers */}
                    {isTeacher && isEditing && editedBreakdown ? (
                      <div className="space-y-4">
                        {editedBreakdown.map((item, index) => (
                          <div
                            key={index}
                            className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <span className="font-semibold text-base text-gray-900">
                                Question {item.questionNumber}
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={item.marksPossible}
                                  value={item.marksAwarded}
                                  onChange={(e) => {
                                    const newBreakdown = [...editedBreakdown]
                                    const newValue = Math.min(
                                      Math.max(0, parseInt(e.target.value) || 0),
                                      item.marksPossible
                                    )
                                    newBreakdown[index].marksAwarded = newValue
                                    setEditedBreakdown(newBreakdown)
                                  }}
                                  className="w-16 px-2 py-1 text-center border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-blue-500 focus:outline-none"
                                />
                                <span className="text-sm text-gray-600">/ {item.marksPossible} marks</span>
                              </div>
                            </div>
                            <Label className="text-sm text-gray-600 mb-2 block">
                              Edit feedback:
                            </Label>
                            <Textarea
                              value={item.explanation}
                              onChange={(e) => {
                                const newBreakdown = [...editedBreakdown]
                                newBreakdown[index].explanation = e.target.value
                                setEditedBreakdown(newBreakdown)
                              }}
                              rows={4}
                              className="w-full resize-none border-2 border-gray-300 focus:border-blue-500"
                            />
                          </div>
                        ))}
                        {/* Edited totals preview */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-amber-800">Updated Total:</span>
                            <span className="text-lg font-bold text-amber-900">
                              {editedBreakdown.reduce((sum, item) => sum + item.marksAwarded, 0)} / {editedBreakdown.reduce((sum, item) => sum + item.marksPossible, 0)} marks
                              <span className="text-sm font-normal ml-2">
                                ({((editedBreakdown.reduce((sum, item) => sum + item.marksAwarded, 0) / editedBreakdown.reduce((sum, item) => sum + item.marksPossible, 0)) * 100).toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={async () => {
                              if (!gradingResult?.id || !editedBreakdown) {
                                toast({
                                  title: "Cannot save",
                                  description: "Grading result ID is missing. Please try grading again.",
                                  variant: "destructive"
                                })
                                return
                              }

                              setIsSaving(true)
                              try {
                                const response = await fetch(`/api/grade-exam/${gradingResult.id}`, {
                                  method: 'PATCH',
                                  credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ gradeBreakdown: editedBreakdown, userId: user?.id })
                                })

                                const result = await response.json()
                                if (!result.success) {
                                  throw new Error(result.error || 'Failed to save edits')
                                }

                                // Update local state with recalculated values
                                setGradingResult(prev => prev ? {
                                  ...prev,
                                  totalMarks: result.data.totalMarks,
                                  totalPossibleMarks: result.data.totalPossibleMarks,
                                  gradeBreakdown: result.data.gradeBreakdown
                                } : null)

                                toast({
                                  title: "Edits saved",
                                  description: `Total score updated to ${result.data.totalMarks}/${result.data.totalPossibleMarks} (${result.data.percentage}%)`
                                })
                                setIsEditing(false)
                              } catch (error) {
                                toast({
                                  title: "Failed to save",
                                  description: error instanceof Error ? error.message : "An error occurred while saving",
                                  variant: "destructive"
                                })
                              } finally {
                                setIsSaving(false)
                              }
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save Edits"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="space-y-3">
                        {(isTeacher && editedBreakdown ? editedBreakdown : gradingResult.gradeBreakdown).map((item, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-semibold text-gray-900">
                                Question {item.questionNumber}
                              </span>
                              <span className="text-sm font-medium text-blue-600">
                                {item.marksAwarded} / {item.marksPossible} marks
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Download PDF Button */}
                <div className="pt-6 border-t border-gray-200 space-y-3">
                  <Button
                    onClick={() => {
                      if (gradingResult.pdfDataUrl) {
                        const link = document.createElement('a')
                        link.href = gradingResult.pdfDataUrl
                        link.download = `Graded_Exam_${Date.now()}.pdf`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      } else if (gradingResult.pdfUrl) {
                        window.open(gradingResult.pdfUrl, "_blank")
                      }
                    }}
                    className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    size="lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Graded PDF
                  </Button>

                  <Button
                    onClick={() => {
                      setGradingResult(null)
                      setStudentExamFiles([])
                      setAnswerSheetFile(null)
                      setAdditionalComments("")
                      setEditedBreakdown(null)
                      setIsEditing(false)
                    }}
                    variant="outline"
                    className="w-full h-14 text-lg font-semibold rounded-xl border-2 border-gray-300"
                    size="lg"
                  >
                    Grade Another Exam
                  </Button>
                </div>

                {/* Full Response Text */}
                {gradingResult.fullResponse && (
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Full Grading Report</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700">
                        {gradingResult.fullResponse}
                      </pre>
                    </div>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(gradingResult.fullResponse!)
                        toast({
                          title: "Copied!",
                          description: "Grading report copied to clipboard.",
                        })
                      }}
                      className="w-full mt-3"
                      variant="outline"
                      size="lg"
                    >
                      Copy Full Report to Clipboard
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, X, CheckCircle, Download, FileCheck, AlertCircle, Edit2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { StreamingGenerationProgress } from "@/components/generation-progress"
import NavigationHeader from "@/components/navigation-header"
import { useAuth } from "@/lib/auth"

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
    const maxSize = 20 * 1024 * 1024 // 20MB
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
      return "File size too large. Please upload files smaller than 20MB"
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
      // Create FormData
      const formData = new FormData()
      if (answerSheetFile) {
        formData.append("markScheme", answerSheetFile)
      }
      // Append all student exam files
      for (const file of studentExamFiles) {
        formData.append("studentExam", file)
      }
      if (additionalComments.trim()) {
        formData.append("additionalComments", additionalComments.trim())
      }
      // Pass userId for authentication (needed because client uses localStorage, not cookies)
      if (user?.id) {
        formData.append("userId", user.id)
      }

      // Use streaming endpoint for teachers
      if (isTeacher) {
        const response = await fetch("/api/grade-exam-stream", {
          method: "POST",
          credentials: "include",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to start grading")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("Failed to read response stream")
        }

        let buffer = ''

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
                throw new Error(data.message)
              }

              if (data.type === 'progress') {
                setStatusMessage(data.message)
              }

              if (data.type === 'content') {
                setGradingContent(prev => prev + data.chunk)
              }

              if (data.type === 'complete') {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <NavigationHeader
        user={user}
        onSignOut={signOut}
      />

      {/* Title Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm opacity-75">
              {pageSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {!isGrading && !gradingResult && (
            <Card className="shadow-xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <FileCheck className="h-6 w-6 text-primary" />
                  Upload Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Student Exam Upload - NOW FIRST */}
                <div className="space-y-3">
                  <Label htmlFor="studentExam" className="font-medium flex items-center gap-2">
                    Student Exam * {studentExamFiles.length > 0 && <span className="text-xs text-muted-foreground">({studentExamFiles.length} file{studentExamFiles.length !== 1 ? 's' : ''})</span>}
                  </Label>

                  {/* Upload area with drag-and-drop */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                      isGrading
                        ? "opacity-50 cursor-not-allowed border-gray-300"
                        : dragActive
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : errors.studentExam
                        ? "border-destructive bg-destructive/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className={`h-12 w-12 mx-auto mb-3 ${dragActive ? "text-primary scale-110" : "text-muted-foreground"} transition-all`} />
                    <p className="text-base mb-2 font-medium">
                      Drag and drop your files here, or{" "}
                      <label className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2 font-semibold">
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
                    <p className="text-xs text-muted-foreground">
                      PDF, DOCX, images (JPG, PNG, HEIC) • Max 20MB per file
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      For handwritten exams: upload multiple page photos
                    </p>
                  </div>
                  {errors.studentExam && (
                    <p className="text-sm text-destructive animate-in slide-in-from-top-1">
                      {errors.studentExam}
                    </p>
                  )}

                  {/* Show uploaded files list BELOW upload area */}
                  {studentExamFiles.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {studentExamFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStudentExam(index)}
                            className="text-muted-foreground hover:text-red-500 flex-shrink-0"
                            disabled={isGrading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Answer Sheet Upload - NOW SECOND AND OPTIONAL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="answerSheet" className="font-medium">
                      Answer Sheet (Optional but Recommended)
                    </Label>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-muted-foreground -mt-1">
                    Providing an answer sheet helps ensure accurate grading and detailed feedback
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                      isGrading
                        ? "opacity-50 cursor-not-allowed border-gray-300"
                        : answerSheetDragActive
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : errors.answerSheet
                        ? "border-destructive bg-destructive/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                    onDragEnter={handleAnswerSheetDrag}
                    onDragLeave={handleAnswerSheetDrag}
                    onDragOver={handleAnswerSheetDrag}
                    onDrop={handleAnswerSheetDrop}
                  >
                    {answerSheetFile ? (
                      <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-green-500" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{answerSheetFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(answerSheetFile.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeAnswerSheet}
                          className="text-muted-foreground hover:text-red-500"
                          disabled={isGrading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className={`h-12 w-12 mx-auto mb-4 ${answerSheetDragActive ? "text-primary scale-110" : "text-muted-foreground"} transition-all`} />
                        <p className="text-base mb-2 font-medium">
                          Drag and drop your answer sheet here, or{" "}
                          <label className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2 font-semibold">
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
                        <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX, or TXT format (max 20MB)</p>
                      </>
                    )}
                  </div>
                  {errors.answerSheet && (
                    <p className="text-sm text-destructive animate-in slide-in-from-top-1">
                      {errors.answerSheet}
                    </p>
                  )}
                </div>

                {/* Additional Comments */}
                <div className="space-y-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <Label htmlFor="additionalComments" className="font-semibold text-base flex items-center gap-2">
                    <span className="text-blue-600">💬</span>
                    Grading Instructions (Optional)
                  </Label>
                  <Textarea
                    id="additionalComments"
                    placeholder="Add specific instructions for the grader (e.g., 'Be lenient on Question 3', 'Focus on application skills', etc.)"
                    value={additionalComments}
                    onChange={(e) => setAdditionalComments(e.target.value)}
                    rows={4}
                    disabled={isGrading}
                    className="resize-none border-2 border-blue-300 focus:border-blue-500 bg-white"
                  />
                  <p className="text-xs text-blue-700 font-medium">
                    💡 These instructions guide the grader but won't appear in the report
                  </p>
                </div>

                {/* Grade Button */}
                <div className="pt-6 border-t">
                  <Button
                    onClick={handleGradeExam}
                    disabled={studentExamFiles.length === 0 || isGrading}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-6 text-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Grade Exam {studentExamFiles.length > 1 && `(${studentExamFiles.length} pages)`}
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Card className="shadow-xl animate-in slide-in-from-bottom-4">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Grading Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Total Score</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {gradingResult.totalMarks} / {gradingResult.totalPossibleMarks} marks
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {((gradingResult.totalMarks / gradingResult.totalPossibleMarks) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Grade Breakdown */}
                {gradingResult.gradeBreakdown && gradingResult.gradeBreakdown.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Question Breakdown</h3>
                      {/* Edit button for teachers only */}
                      {isTeacher && !isEditing && (
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          size="sm"
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
                            className="border-2 border-primary/30 rounded-lg p-4 bg-blue-50/50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <span className="font-semibold text-base">
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
                                  className="w-16 px-2 py-1 text-center border rounded text-sm font-medium"
                                />
                                <span className="text-sm text-muted-foreground">/ {item.marksPossible} marks</span>
                              </div>
                            </div>
                            <Label className="text-sm text-muted-foreground mb-2 block">
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
                              className="w-full resize-none"
                            />
                          </div>
                        ))}
                        {/* Edited totals preview */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
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
                            className="flex-1"
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
                            className="bg-muted/50 border rounded-lg p-4 hover:bg-muted/80 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-semibold">
                                Question {item.questionNumber}
                              </span>
                              <span className="text-sm font-medium text-primary">
                                {item.marksAwarded} / {item.marksPossible} marks
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Download PDF Button */}
                <div className="pt-6 border-t space-y-3">
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
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-6 text-lg font-semibold"
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
                    className="w-full"
                    size="lg"
                  >
                    Grade Another Exam
                  </Button>
                </div>

                {/* Full Response Text */}
                {gradingResult.fullResponse && (
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-3">Full Grading Report</h3>
                    <div className="bg-muted/30 border rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

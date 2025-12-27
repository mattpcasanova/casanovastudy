"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, X, CheckCircle, Download, FileCheck, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { StreamingGenerationProgress } from "@/components/generation-progress"
import NavigationHeader from "@/components/navigation-header"
import { useAuth } from "@/lib/auth"

interface GradingResult {
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
  const { user, signOut } = useAuth()
  const [answerSheetFile, setAnswerSheetFile] = useState<File | null>(null)
  const [studentExamFile, setStudentExamFile] = useState<File | null>(null)
  const [additionalComments, setAdditionalComments] = useState<string>("")
  const [isGrading, setIsGrading] = useState(false)
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [gradingContent, setGradingContent] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

  const { toast } = useToast()

  const validateFile = (file: File): string | null => {
    const maxSize = 20 * 1024 * 1024 // 20MB
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain"
    ]

    if (!allowedTypes.includes(file.type)) {
      return "Only PDF, DOCX, PPTX, or TXT files are supported."
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
      setStudentExamFile(file)
      setErrors((prev) => ({ ...prev, studentExam: "" }))
      toast({
        title: "Student exam uploaded",
        description: `${file.name} has been uploaded successfully.`,
      })
    }
  }

  const removeAnswerSheet = () => {
    setAnswerSheetFile(null)
    toast({
      title: "Answer sheet removed",
      description: "Answer sheet file has been removed.",
    })
  }

  const removeStudentExam = () => {
    setStudentExamFile(null)
    toast({
      title: "Student exam removed",
      description: "Student exam file has been removed.",
    })
  }

  const handleGradeExam = async () => {
    // Validate - only student exam is required
    const newErrors: Record<string, string> = {}
    if (!studentExamFile) {
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
    setStatusMessage("Analyzing exam...")
    setErrors({})

    try {
      // Create FormData
      const formData = new FormData()
      if (answerSheetFile) {
        formData.append("markScheme", answerSheetFile)
      }
      formData.append("studentExam", studentExamFile!)
      if (additionalComments.trim()) {
        formData.append("additionalComments", additionalComments.trim())
      }

      // Call API
      setStatusMessage("Grading exam...")
      const response = await fetch("/api/grade-exam", {
        method: "POST",
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
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              Exam Grading Assistant
            </h1>
            <p className="text-xs sm:text-sm opacity-75">
              Upload student exams to receive detailed grading with marks and feedback
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
                    Student Exam *
                  </Label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                      errors.studentExam
                        ? "border-destructive bg-destructive/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {studentExamFile ? (
                      <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{studentExamFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(studentExamFile.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeStudentExam}
                          className="text-muted-foreground hover:text-red-500"
                          disabled={isGrading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg mb-3 font-medium">
                          <label className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2 font-semibold">
                            Click to upload student exam
                            <input
                              type="file"
                              id="studentExam"
                              accept=".pdf,.docx,.pptx,.txt"
                              onChange={handleStudentExamUpload}
                              className="hidden"
                              disabled={isGrading}
                            />
                          </label>
                        </p>
                        <p className="text-sm text-muted-foreground">PDF, DOCX, PPTX, or TXT format (max 20MB)</p>
                      </>
                    )}
                  </div>
                  {errors.studentExam && (
                    <p className="text-sm text-destructive animate-in slide-in-from-top-1">
                      {errors.studentExam}
                    </p>
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
                      errors.answerSheet
                        ? "border-destructive bg-destructive/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
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
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg mb-3 font-medium">
                          <label className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2 font-semibold">
                            Click to upload answer sheet
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
                        <p className="text-sm text-muted-foreground">PDF, DOCX, PPTX, or TXT format (max 20MB)</p>
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
                    disabled={!studentExamFile || isGrading}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-6 text-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Grade Exam
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
                    <h3 className="text-lg font-semibold">Question Breakdown</h3>
                    <div className="space-y-3">
                      {gradingResult.gradeBreakdown.map((item, index) => (
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
                      setStudentExamFile(null)
                      setAnswerSheetFile(null)
                      setAdditionalComments("")
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

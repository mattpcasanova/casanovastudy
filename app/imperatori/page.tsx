"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Download, FileCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import Image from "next/image"

interface GradingResult {
  pdfUrl: string
  pdfDataUrl?: string // Base64 data URL as fallback for downloads
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

export default function ImperatoriGradingPage() {
  const [markSchemeFile, setMarkSchemeFile] = useState<File | null>(null)
  const [studentExamFile, setStudentExamFile] = useState<File | null>(null)
  const [additionalComments, setAdditionalComments] = useState<string>("")
  const [isGrading, setIsGrading] = useState(false)
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { toast } = useToast()

  const validateFile = (file: File): string | null => {
    const maxSize = 20 * 1024 * 1024 // 20MB
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // DOCX
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return "Only PDF or DOCX files are supported. DOCX files are recommended for better text extraction."
    }
    if (file.size > maxSize) {
      return "File size too large. Please upload files smaller than 20MB"
    }
    return null
  }

  const handleMarkSchemeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setMarkSchemeFile(file)
      setErrors((prev) => ({ ...prev, markScheme: "" }))
      toast({
        title: "Mark scheme uploaded",
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

  const removeMarkScheme = () => {
    setMarkSchemeFile(null)
    toast({
      title: "Mark scheme removed",
      description: "Mark scheme file has been removed.",
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
    // Validate
    const newErrors: Record<string, string> = {}
    if (!markSchemeFile) {
      newErrors.markScheme = "Please upload a mark scheme PDF"
    }
    if (!studentExamFile) {
      newErrors.studentExam = "Please upload a student exam PDF"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast({
        title: "Missing files",
        description: "Please upload both mark scheme and student exam PDFs.",
        variant: "destructive",
      })
      return
    }

    setIsGrading(true)
    setGradingResult(null)
    setErrors({})

    try {
      // Create FormData - send files and additional comments
      const formData = new FormData()
      formData.append("markScheme", markSchemeFile!)
      formData.append("studentExam", studentExamFile!)
      if (additionalComments.trim()) {
        formData.append("additionalComments", additionalComments.trim())
      }

      // Call API
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative">
          {/* Logo */}
          <div className="mb-6">
            <Link href="/" className="inline-block">
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                <Image
                  src="/images/casanova-study-logo.png"
                  alt="Casanova Study Logo"
                  width={160}
                  height={60}
                  className="h-12 w-auto"
                />
              </div>
            </Link>
          </div>

          <div className="flex justify-center mb-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                AICE Business Exam Grading Assistant
              </h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                Upload your mark scheme and student exam to receive detailed grading with marks and explanations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl text-foreground flex items-center gap-3">
                <FileCheck className="h-6 w-6 text-primary" />
                Upload Documents
              </CardTitle>
              <p className="text-muted-foreground text-pretty">
                Upload the mark scheme PDF and the student's exam PDF to begin grading
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mark Scheme Upload */}
              <div className="space-y-3">
                <Label htmlFor="markScheme" className="text-foreground font-medium">
                  Mark Scheme PDF *
                </Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                    errors.markScheme
                      ? "border-destructive bg-destructive/5"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {markSchemeFile ? (
                    <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-red-500" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{markSchemeFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(markSchemeFile.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeMarkScheme}
                        className="text-muted-foreground hover:text-red-500"
                        disabled={isGrading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg mb-3 text-foreground font-medium">
                        <label className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2 font-semibold">
                          Click to upload mark scheme
                          <input
                            type="file"
                            id="markScheme"
                            accept=".pdf,.docx"
                            onChange={handleMarkSchemeUpload}
                            className="hidden"
                            disabled={isGrading}
                          />
                        </label>
                      </p>
                      <p className="text-sm text-muted-foreground">PDF or DOCX format (max 20MB). DOCX recommended for better extraction.</p>
                    </>
                  )}
                </div>
                {errors.markScheme && (
                  <p className="text-sm text-destructive animate-in slide-in-from-top-1">
                    {errors.markScheme}
                  </p>
                )}
              </div>

              {/* Student Exam Upload */}
              <div className="space-y-3">
                <Label htmlFor="studentExam" className="text-foreground font-medium">
                  Student Exam PDF *
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
                          <span className="text-sm font-medium text-foreground">{studentExamFile.name}</span>
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
                      <p className="text-lg mb-3 text-foreground font-medium">
                        <label className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2 font-semibold">
                          Click to upload student exam
                          <input
                            type="file"
                            id="studentExam"
                            accept=".pdf,.docx"
                            onChange={handleStudentExamUpload}
                            className="hidden"
                            disabled={isGrading}
                          />
                        </label>
                      </p>
                      <p className="text-sm text-muted-foreground">PDF or DOCX format (max 20MB). DOCX recommended for better extraction.</p>
                    </>
                  )}
                </div>
                {errors.studentExam && (
                  <p className="text-sm text-destructive animate-in slide-in-from-top-1">
                    {errors.studentExam}
                  </p>
                )}
              </div>

              {/* Additional Comments (Optional) */}
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                <Label htmlFor="additionalComments" className="text-foreground font-semibold text-base flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">💬</span>
                  Grading Instructions (Optional)
                </Label>
                <Textarea
                  id="additionalComments"
                  placeholder="Add specific instructions for the AI grader (e.g., 'Be lenient on Question 3', 'Student struggled with time management', 'Focus on application skills', etc.)"
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  rows={4}
                  disabled={isGrading}
                  className="resize-none border-2 border-blue-300 focus:border-blue-500 bg-white dark:bg-gray-900"
                />
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  💡 These instructions guide the AI grader but won't appear in the PDF report
                </p>
              </div>

              {/* Grade Button */}
              <div className="pt-6 border-t">
                <Button
                  onClick={handleGradeExam}
                  disabled={!markSchemeFile || !studentExamFile || isGrading}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground py-6 text-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl"
                  size="lg"
                >
                  {isGrading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Analyzing and Grading Exam...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Grade Exam
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {gradingResult && (
            <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm animate-in slide-in-from-bottom-4">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl text-foreground flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Grading Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Total Score</h3>
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
                    <h3 className="text-lg font-semibold text-foreground">Question Breakdown</h3>
                    <div className="space-y-3">
                      {gradingResult.gradeBreakdown.map((item, index) => (
                        <div
                          key={index}
                          className="bg-muted/50 border rounded-lg p-4 hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-semibold text-foreground">
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
                <div className="pt-6 border-t">
                  <Button
                    onClick={() => {
                      // Use base64 data URL as primary method (more reliable in serverless environments)
                      if (gradingResult.pdfDataUrl) {
                        const link = document.createElement('a')
                        link.href = gradingResult.pdfDataUrl
                        link.download = `Graded_Exam_${Date.now()}.pdf`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      } else if (gradingResult.pdfUrl) {
                        // Fallback to API route
                        window.open(gradingResult.pdfUrl, "_blank")
                      }
                    }}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground py-6 text-lg font-semibold"
                    size="lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Graded PDF
                  </Button>
                </div>

                {/* Full Response Text - Easy to Copy (as backup) */}
                {gradingResult.fullResponse && (
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Full Grading Report (Copy to Google Docs)</h3>
                    <div className="bg-muted/30 border rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                        {gradingResult.fullResponse}
                      </pre>
                    </div>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(gradingResult.fullResponse!)
                        toast({
                          title: "Copied!",
                          description: "Grading report copied to clipboard. Paste into Google Docs.",
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


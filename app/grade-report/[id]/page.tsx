"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Download, FileCheck, CheckCircle, Edit2, ArrowLeft, Loader2, Printer, ChevronUp, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import NavigationHeader from "@/components/navigation-header"
import { useAuth } from "@/lib/auth"

interface GradingResult {
  id: string
  studentName: string
  answerSheetFilename: string | null
  studentExamFilename: string
  totalMarks: number
  totalPossibleMarks: number
  percentage: number
  grade: string
  content: string
  gradeBreakdown: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }>
  additionalComments: string | null
  pdfUrl: string | null
  createdAt: string
  updatedAt: string
  isOwner: boolean
}

export default function GradeReportPage() {
  const params = useParams()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const id = params.id as string

  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editing state
  const [editedBreakdown, setEditedBreakdown] = useState<GradingResult['gradeBreakdown'] | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const isTeacher = user?.user_type === 'teacher'
  const canEdit = isTeacher && gradingResult?.isOwner

  useEffect(() => {
    const fetchGradingResult = async () => {
      try {
        const url = user?.id
          ? `/api/grade-exam/${id}?userId=${user.id}`
          : `/api/grade-exam/${id}`

        const response = await fetch(url)
        const data = await response.json()

        if (!data.success) {
          setError(data.error || 'Failed to load grading result')
          return
        }

        setGradingResult(data.data)
        setEditedBreakdown(data.data.gradeBreakdown)
      } catch (err) {
        console.error('Error fetching grading result:', err)
        setError('Failed to load grading result')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchGradingResult()
    }
  }, [id, user?.id])

  const handleSaveQuestion = async (index: number) => {
    if (!gradingResult?.id || !editedBreakdown) return

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

      setGradingResult(prev => prev ? {
        ...prev,
        totalMarks: result.data.totalMarks,
        totalPossibleMarks: result.data.totalPossibleMarks,
        percentage: result.data.percentage,
        grade: result.data.grade,
        gradeBreakdown: result.data.gradeBreakdown
      } : null)

      toast({
        title: "Saved",
        description: `Question ${editedBreakdown[index].questionNumber} updated`
      })
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    if (gradingResult?.pdfUrl) {
      window.open(gradingResult.pdfUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader user={user} onSignOut={signOut} />
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading grading report...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !gradingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader user={user} onSignOut={signOut} />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error || 'Report not found'}</p>
              <Button onClick={() => router.push('/grade-exam')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Grade Exam
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader user={user} onSignOut={signOut} />

      {/* Title Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              Grading Report
            </h1>
            <p className="text-xs sm:text-sm opacity-75">
              {gradingResult.studentName} - {new Date(gradingResult.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-xl">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Grading Complete
                </CardTitle>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    {isEditing ? "View Mode" : "Edit Mode"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{gradingResult.totalMarks}/{gradingResult.totalPossibleMarks}</p>
                  <p className="text-sm text-muted-foreground">Total Marks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{gradingResult.percentage.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Percentage</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{gradingResult.grade}</p>
                  <p className="text-sm text-muted-foreground">Grade</p>
                </div>
              </div>

              {/* Grade Breakdown */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Question Breakdown</h3>
                <div className="space-y-3">
                  {(isEditing && editedBreakdown ? editedBreakdown : gradingResult.gradeBreakdown).map((item, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${isEditing ? 'border-2 border-primary/30 bg-blue-50/50' : 'bg-muted/30'}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-semibold">
                          {/^(Question|Section|Q\d)/i.test(item.questionNumber) ? item.questionNumber : `Question ${item.questionNumber}`}
                        </span>
                        {isEditing && editedBreakdown ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newBreakdown = [...editedBreakdown]
                                if (newBreakdown[index].marksAwarded > 0) {
                                  newBreakdown[index].marksAwarded -= 1
                                  setEditedBreakdown(newBreakdown)
                                }
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 border border-gray-200 transition-colors"
                              title="Decrease mark"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
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
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveQuestion(index)
                                }
                              }}
                              className="w-14 px-1 py-1 text-center border rounded text-sm font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newBreakdown = [...editedBreakdown]
                                if (newBreakdown[index].marksAwarded < item.marksPossible) {
                                  newBreakdown[index].marksAwarded += 1
                                  setEditedBreakdown(newBreakdown)
                                }
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 border border-gray-200 transition-colors"
                              title="Increase mark"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-muted-foreground ml-1">/ {item.marksPossible}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveQuestion(index)}
                              disabled={isSaving}
                              className="ml-2"
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 whitespace-nowrap ${
                            item.marksAwarded === item.marksPossible
                              ? 'bg-green-100 text-green-700'
                              : item.marksAwarded >= item.marksPossible * 0.7
                              ? 'bg-blue-100 text-blue-700'
                              : item.marksAwarded >= item.marksPossible * 0.5
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.marksAwarded}/{item.marksPossible} marks
                          </span>
                        )}
                      </div>
                      {isEditing && editedBreakdown ? (
                        <div className="mt-3">
                          <Label className="text-sm text-muted-foreground mb-2 block">Feedback:</Label>
                          <Textarea
                            value={item.explanation}
                            onChange={(e) => {
                              const newBreakdown = [...editedBreakdown]
                              newBreakdown[index].explanation = e.target.value
                              setEditedBreakdown(newBreakdown)
                            }}
                            rows={3}
                            className="w-full resize-none"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bottom save button when in edit mode */}
                {isEditing && editedBreakdown && (
                  <div className="flex gap-3 pt-4 border-t mt-4">
                    <Button
                      onClick={async () => {
                        if (!gradingResult?.id || !editedBreakdown) return
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
                          setGradingResult(prev => prev ? {
                            ...prev,
                            totalMarks: result.data.totalMarks,
                            totalPossibleMarks: result.data.totalPossibleMarks,
                            percentage: result.data.percentage,
                            grade: result.data.grade,
                            gradeBreakdown: result.data.gradeBreakdown
                          } : null)
                          toast({
                            title: "All changes saved",
                            description: `Total score: ${result.data.totalMarks}/${result.data.totalPossibleMarks} (${result.data.percentage.toFixed(1)}%)`
                          })
                          setIsEditing(false)
                        } catch (error) {
                          toast({
                            title: "Failed to save",
                            description: error instanceof Error ? error.message : "An error occurred",
                            variant: "destructive"
                          })
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                      className="flex-1"
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      {isSaving ? "Saving..." : "Save All Changes"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditedBreakdown(gradingResult.gradeBreakdown)
                        setIsEditing(false)
                      }}
                      variant="outline"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t">
                {/* Print Report Button */}
                <Button
                  onClick={() => {
                    // Create a printable version
                    const printWindow = window.open('', '_blank')
                    if (!printWindow) {
                      toast({
                        title: "Unable to print",
                        description: "Please allow pop-ups for this site",
                        variant: "destructive"
                      })
                      return
                    }

                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Grade Report - ${gradingResult.studentName}</title>
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 30px 40px; color: #1f2937; line-height: 1.5; max-width: 100%; }
                          .container { width: 100%; max-width: 900px; margin: 0 auto; }
                          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
                          .header h1 { font-size: 28px; color: #111827; margin-bottom: 8px; }
                          .header p { color: #6b7280; font-size: 14px; }
                          .summary { display: flex; justify-content: space-around; margin: 30px 0; padding: 24px; background: #f9fafb; border-radius: 8px; }
                          .summary-item { text-align: center; flex: 1; }
                          .summary-item .value { font-size: 32px; font-weight: bold; color: #3b82f6; }
                          .summary-item .label { font-size: 13px; color: #6b7280; margin-top: 4px; }
                          .section-title { font-size: 18px; font-weight: 600; margin: 28px 0 16px; color: #374151; }
                          .question { padding: 18px 20px; margin-bottom: 14px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
                          .question-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 12px; }
                          .question-num { font-weight: 600; font-size: 15px; }
                          .question-marks { font-size: 14px; padding: 5px 14px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
                          .marks-full { background: #dcfce7; color: #166534; }
                          .marks-good { background: #dbeafe; color: #1e40af; }
                          .marks-ok { background: #fef3c7; color: #92400e; }
                          .marks-low { background: #fee2e2; color: #991b1b; }
                          .explanation { font-size: 14px; color: #4b5563; line-height: 1.6; }
                          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
                          @media print {
                            body { padding: 15px 20px; }
                            .container { max-width: 100%; }
                            .question { break-inside: avoid; }
                          }
                          @page { margin: 0.5in; size: letter; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h1>Exam Grading Report</h1>
                            <p>${gradingResult.studentName} • ${new Date(gradingResult.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>

                          <div class="summary">
                            <div class="summary-item">
                              <div class="value">${gradingResult.totalMarks}/${gradingResult.totalPossibleMarks}</div>
                              <div class="label">Total Marks</div>
                            </div>
                            <div class="summary-item">
                              <div class="value">${gradingResult.percentage.toFixed(1)}%</div>
                              <div class="label">Percentage</div>
                            </div>
                            <div class="summary-item">
                              <div class="value">${gradingResult.grade}</div>
                              <div class="label">Grade</div>
                            </div>
                          </div>

                          <div class="section-title">Question Breakdown</div>
                          ${gradingResult.gradeBreakdown.map(item => {
                            const pct = item.marksPossible > 0 ? (item.marksAwarded / item.marksPossible) * 100 : 0
                            const marksClass = pct === 100 ? 'marks-full' : pct >= 70 ? 'marks-good' : pct >= 50 ? 'marks-ok' : 'marks-low'
                            // Don't add "Question" prefix if the number already contains it or starts with Section
                            const qNum = item.questionNumber
                            const displayNum = /^(Question|Section|Q\\d)/i.test(qNum) ? qNum : 'Question ' + qNum
                            return '<div class="question">' +
                              '<div class="question-header">' +
                              '<span class="question-num">' + displayNum + '</span>' +
                              '<span class="question-marks ' + marksClass + '">' + item.marksAwarded + '/' + item.marksPossible + ' marks</span>' +
                              '</div>' +
                              '<p class="explanation">' + item.explanation + '</p>' +
                              '</div>'
                          }).join('')}

                          <div class="footer">
                            Generated by Casanova Study • ${new Date().toLocaleDateString()}
                          </div>
                        </div>
                      </body>
                      </html>
                    `)
                    printWindow.document.close()
                    printWindow.print()
                  }}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  size="lg"
                >
                  <Printer className="h-5 w-5 mr-2" />
                  Print Report
                </Button>
                {gradingResult.pdfUrl && (
                  <Button onClick={handleDownload} className="w-full" variant="outline" size="lg">
                    <Download className="h-5 w-5 mr-2" />
                    Download Graded PDF
                  </Button>
                )}
                <Button
                  onClick={() => router.push('/grade-exam')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <FileCheck className="h-5 w-5 mr-2" />
                  Grade Another Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, Mail, FileText, CheckCircle, Sparkles, Share2, BookOpen, Smartphone, Link, Printer } from "lucide-react"
import { StudyGuideData, StudyGuideResponse } from "@/types"
import { useState } from "react"

interface ResultsPageProps {
  studyGuideData: StudyGuideData | null
  studyGuideResponse: StudyGuideResponse | null
  onBack: () => void
  onCreateAnother: () => void
}

export default function ResultsPage({ studyGuideData, studyGuideResponse, onBack, onCreateAnother }: ResultsPageProps) {
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)


  const handleViewStudyGuide = () => {
    if (studyGuideResponse?.studyGuideUrl) {
      window.location.href = studyGuideResponse.studyGuideUrl
    }
  }

  const handleSendEmail = async () => {
    if (!email || !studyGuideResponse) return

    setIsSendingEmail(true)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: email,
          subject: `Your ${studyGuideResponse.title} is ready!`,
          studyGuideId: studyGuideResponse.id,
          pdfUrl: studyGuideResponse.pdfUrl
        })
      })

      if (response.ok) {
        setEmailSent(true)
        setTimeout(() => setEmailSent(false), 3000)
      } else {
        alert('Failed to send email. Please try again.')
      }
    } catch (error) {
      console.error('Email error:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-10 relative overflow-hidden">
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

        {/* Animated background orbs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="container mx-auto px-4 py-4 relative">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-white hover:bg-white/10 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <CheckCircle className="h-12 w-12 text-green-400 animate-in zoom-in-50 duration-500" />
                <div className="absolute inset-0 h-12 w-12 bg-green-400/20 rounded-full animate-ping"></div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-balance animate-in slide-in-from-bottom-4 duration-700">
                Success!
              </h1>
              <Sparkles className="h-12 w-12 text-yellow-300 animate-bounce" />
            </div>
            <p className="text-xl font-semibold mb-2 animate-in slide-in-from-bottom-6 duration-700 [animation-delay:200ms]">
              Your Interactive Study Guide is Ready
            </p>
            <p className="text-base text-white/80 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom-6 duration-700 [animation-delay:400ms]">
              Click below to view your personalized, interactive study guide
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl text-foreground flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                Study Guide Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-muted/50 to-muted/80 rounded-xl p-8 min-h-[400px] border-2 border-dashed border-border/50">
                {studyGuideResponse ? (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="relative inline-block">
                        <FileText className="h-16 w-16 mx-auto text-primary" />
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-accent-foreground" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mt-4">
                        {studyGuideResponse.title}
                      </h3>
                      <div className="flex items-center justify-center gap-4 text-muted-foreground mt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span>Subject: {studyGuideResponse.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                          <span>Grade: {studyGuideResponse.gradeLevel}</span>
                        </div>
                        {studyGuideResponse.tokenUsage && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-muted-foreground">
                              Tokens: {studyGuideResponse.tokenUsage.total_tokens.toLocaleString()} 
                              (${(studyGuideResponse.tokenUsage.total_tokens * 0.000015).toFixed(4)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-background/80 rounded-lg p-6 max-h-96 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ 
                          __html: studyGuideResponse.content
                            .replace(/\n/g, '<br>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <FileText className="h-20 w-20 mx-auto text-primary animate-pulse" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-accent-foreground" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-foreground">
                        {studyGuideData?.format ? studyGuideData.format.charAt(0).toUpperCase() + studyGuideData.format.slice(1) : 'Study'} Study Guide
                      </h3>
                      <div className="flex items-center justify-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span>Subject: {studyGuideData?.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                          <span>Grade: {studyGuideData?.gradeLevel}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground bg-background/50 px-4 py-2 rounded-full inline-block">
                        Generated from {studyGuideData?.files.length} file(s)
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-muted-foreground text-sm">
                        Your generated study guide will appear here once the backend processing is complete
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-0 overflow-hidden transition-all duration-300 hover:shadow-3xl animate-in slide-in-from-bottom-8 duration-700 [animation-delay:200ms] max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-6">
              <h3 className="text-xl font-semibold flex items-center gap-2 justify-center">
                <BookOpen className="h-5 w-5" />
                Access Your Study Guide
              </h3>
            </div>
            <CardContent className="space-y-5 pt-6 pb-6 bg-gradient-to-br from-white to-blue-50">
                <div className="text-center space-y-2">
                  <p className="text-base font-semibold text-gray-800">
                    {studyGuideData?.format && `${studyGuideData.format.charAt(0).toUpperCase() + studyGuideData.format.slice(1)}`} Format
                  </p>
                  <p className="text-sm text-gray-600">
                    {studyGuideData?.format === 'flashcards' ? '3D flip cards with mastery tracking' : studyGuideData?.format === 'quiz' ? 'Interactive questions with instant feedback' : studyGuideData?.format === 'outline' ? 'Collapsible sections with progress tracking' : 'Highlighted key terms and study tips'}
                  </p>
                </div>

                <Button
                  onClick={handleViewStudyGuide}
                  disabled={!studyGuideResponse?.studyGuideUrl}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  {studyGuideResponse?.studyGuideUrl ? 'View Interactive Study Guide' : 'Generating...'}
                </Button>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-gradient-to-r from-white to-blue-50 text-gray-500">or</span>
                  </div>
                </div>

                <Button
                  onClick={onCreateAnother}
                  variant="outline"
                  className="w-full h-11 border-2 border-indigo-400 text-indigo-600 hover:bg-indigo-600 hover:text-white bg-transparent transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Another Study Guide
                </Button>
              </CardContent>
            </Card>

          {/* Quick Tips Card */}
          <Card className="shadow-xl border-2 border-green-200 bg-gradient-to-br from-white to-green-50 transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-bottom-8 duration-700 [animation-delay:400ms] max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-2">
                  <Sparkles className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">What's Next?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4 text-green-600" />
                      <div className="font-semibold text-gray-800">Mobile Friendly</div>
                    </div>
                    <p className="text-gray-600">Study on any device, anywhere</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Link className="h-4 w-4 text-green-600" />
                      <div className="font-semibold text-gray-800">Share Link</div>
                    </div>
                    <p className="text-gray-600">Copy URL to share with classmates</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Printer className="h-4 w-4 text-green-600" />
                      <div className="font-semibold text-gray-800">Print Option</div>
                    </div>
                    <p className="text-gray-600">Download PDF if needed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {studyGuideData && (
            <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-bottom-8 duration-700 [animation-delay:600ms] max-w-4xl mx-auto">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl text-foreground flex items-center gap-3">
                  <Share2 className="h-5 w-5 text-primary" />
                  Study Guide Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="font-medium text-foreground">Subject:</span>
                      <span className="text-muted-foreground capitalize">{studyGuideData.subject}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <span className="font-medium text-foreground">Grade Level:</span>
                      <span className="text-muted-foreground">{studyGuideData.gradeLevel}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="font-medium text-foreground">Format:</span>
                      <span className="text-muted-foreground capitalize">{studyGuideData.format}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {studyGuideData.difficultyLevel && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                        <span className="font-medium text-foreground">Difficulty:</span>
                        <span className="text-muted-foreground capitalize">{studyGuideData.difficultyLevel}</span>
                      </div>
                    )}
                    {studyGuideData.topicFocus && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-medium text-foreground block mb-1">Topic Focus:</span>
                          <span className="text-muted-foreground">{studyGuideData.topicFocus}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <span className="font-medium text-foreground">Files:</span>
                      <span className="text-muted-foreground">{studyGuideData.files.length} uploaded</span>
                    </div>
                  </div>
                  {studyGuideData.additionalInstructions && (
                    <div className="md:col-span-2 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        <div>
                          <span className="font-medium text-foreground block mb-1">Additional Instructions:</span>
                          <span className="text-muted-foreground text-sm leading-relaxed">
                            {studyGuideData.additionalInstructions}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, Mail, FileText, CheckCircle, Sparkles, Share2 } from "lucide-react"
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

  const handleViewHTML = () => {
    if (studyGuideResponse?.htmlContent) {
      // Create a new window with the HTML content
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(studyGuideResponse.htmlContent)
        newWindow.document.close()
      }
    }
  }

  const handleDownloadPDF = () => {
    if (studyGuideResponse?.htmlContent) {
      // Create a blob with the HTML content
      const blob = new Blob([studyGuideResponse.htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link to download the HTML file
      const link = document.createElement('a')
      link.href = url
      link.download = `${studyGuideResponse.title}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL
      URL.revokeObjectURL(url)
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
          htmlContent: studyGuideResponse.htmlContent
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground py-12 relative overflow-hidden">
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
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="h-12 w-12 text-green-400 animate-in zoom-in-50 duration-500" />
              <h1 className="text-5xl font-bold text-balance animate-in slide-in-from-bottom-4 duration-700">
                Study Guide Complete!
              </h1>
              <Sparkles className="h-12 w-12 text-yellow-400 animate-pulse" />
            </div>
            <p className="text-xl text-primary-foreground/90 text-pretty max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom-6 duration-700 [animation-delay:200ms]">
              Your personalized study guide is ready for download and sharing
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
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
                        {studyGuideData?.format.charAt(0).toUpperCase() + studyGuideData?.format.slice(1)} Study Guide
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

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-left-8 duration-700 [animation-delay:200ms]">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl text-foreground flex items-center gap-3">
                  <Download className="h-5 w-5 text-primary" />
                  Download & Share
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleViewHTML}
                  disabled={!studyGuideResponse?.htmlContent}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {studyGuideResponse?.htmlContent ? 'View Study Guide' : 'Generating...'}
                </Button>

                <Button
                  onClick={handleDownloadPDF}
                  disabled={!studyGuideResponse?.htmlContent}
                  variant="outline"
                  className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download HTML
                </Button>

                <Button
                  onClick={onCreateAnother}
                  variant="outline"
                  className="w-full border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Another Guide
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-right-8 duration-700 [animation-delay:400ms]">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl text-foreground flex items-center gap-3">
                  <Mail className="h-5 w-5 text-accent" />
                  Email Study Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="transition-all duration-200 hover:border-accent/50 focus:border-accent"
                  />
                </div>

                <Button
                  onClick={handleSendEmail}
                  disabled={!email || !studyGuideResponse?.htmlContent || isSendingEmail}
                  className={`w-full transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                    emailSent
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground"
                  }`}
                  size="lg"
                >
                  {emailSent ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Email Sent!
                    </>
                  ) : isSendingEmail ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {studyGuideData && (
            <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-bottom-8 duration-700 [animation-delay:600ms]">
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

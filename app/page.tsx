"use client"

import { useState } from "react"
import UploadPage from "@/components/upload-page"
import ResultsPage from "@/components/results-page"
import { Toaster } from "@/components/ui/toaster"

export type StudyGuideData = {
  files: File[]
  subject: string
  gradeLevel: string
  format: string
  topicFocus?: string
  difficultyLevel?: string
  additionalInstructions?: string
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"upload" | "results">("upload")
  const [studyGuideData, setStudyGuideData] = useState<StudyGuideData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateStudyGuide = async (data: StudyGuideData) => {
    setIsGenerating(true)

    try {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setStudyGuideData(data)
      setCurrentPage("results")
    } catch (error) {
      console.error("Error generating study guide:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBackToUpload = () => {
    setCurrentPage("upload")
    setStudyGuideData(null)
  }

  const handleCreateAnother = () => {
    setCurrentPage("upload")
    setStudyGuideData(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {currentPage === "upload" ? (
        <UploadPage onGenerateStudyGuide={handleGenerateStudyGuide} isGenerating={isGenerating} />
      ) : (
        <ResultsPage
          studyGuideData={studyGuideData}
          onBack={handleBackToUpload}
          onCreateAnother={handleCreateAnother}
        />
      )}
      <Toaster />
    </main>
  )
}

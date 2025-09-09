"use client"

import { useState } from "react"
import UploadPage from "@/components/upload-page"
import ResultsPage from "@/components/results-page"
import { Toaster } from "@/components/ui/toaster"
import { StudyGuideData, StudyGuideResponse, ProcessedFile } from "@/types"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"upload" | "results">("upload")
  const [studyGuideData, setStudyGuideData] = useState<StudyGuideData | null>(null)
  const [studyGuideResponse, setStudyGuideResponse] = useState<StudyGuideResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateStudyGuide = async (data: StudyGuideData) => {
    setIsGenerating(true)

    try {
      // Step 1: Upload and process files
      const formData = new FormData()
      data.files.forEach(file => formData.append('files', file))

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files')
      }

      const uploadResult = await uploadResponse.json()
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      // Step 2: Generate study guide
      const studyGuideRequest = {
        files: uploadResult.data.files,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        format: data.format,
        topicFocus: data.topicFocus,
        difficultyLevel: data.difficultyLevel,
        additionalInstructions: data.additionalInstructions
      }

      const generateResponse = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studyGuideRequest)
      })

      if (!generateResponse.ok) {
        throw new Error('Failed to generate study guide')
      }

      const generateResult = await generateResponse.json()
      if (!generateResult.success) {
        throw new Error(generateResult.error || 'Generation failed')
      }

      setStudyGuideData(data)
      setStudyGuideResponse(generateResult.data)
      setCurrentPage("results")
    } catch (error) {
      console.error("Error generating study guide:", error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBackToUpload = () => {
    setCurrentPage("upload")
    setStudyGuideData(null)
    setStudyGuideResponse(null)
  }

  const handleCreateAnother = () => {
    setCurrentPage("upload")
    setStudyGuideData(null)
    setStudyGuideResponse(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {currentPage === "upload" ? (
        <UploadPage onGenerateStudyGuide={handleGenerateStudyGuide} isGenerating={isGenerating} />
      ) : (
        <ResultsPage
          studyGuideData={studyGuideData}
          studyGuideResponse={studyGuideResponse}
          onBack={handleBackToUpload}
          onCreateAnother={handleCreateAnother}
        />
      )}
      <Toaster />
    </main>
  )
}

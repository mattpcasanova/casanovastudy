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
      // Step 1: Upload files to Cloudinary
      const cloudinaryUploads = await Promise.all(
        data.files.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('folder', 'casanovastudy')

          const response = await fetch('/api/upload-to-cloudinary', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          return await response.json()
        })
      )

      console.log('Cloudinary uploads completed:', cloudinaryUploads)

      // Step 2: Generate study guide using Cloudinary URLs
      const studyGuideRequest = {
        cloudinaryFiles: cloudinaryUploads.map(upload => ({
          url: upload.url,
          filename: upload.filename,
          size: upload.size,
          format: upload.format
        })),
        studyGuideName: data.studyGuideName,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        format: data.format,
        topicFocus: data.topicFocus,
        difficultyLevel: data.difficultyLevel,
        additionalInstructions: data.additionalInstructions
      }

      console.log('Study Guide Request:', {
        studyGuideName: studyGuideRequest.studyGuideName,
        subject: studyGuideRequest.subject,
        gradeLevel: studyGuideRequest.gradeLevel,
        format: studyGuideRequest.format,
        fileCount: studyGuideRequest.cloudinaryFiles?.length || studyGuideRequest.files?.length || 0
      })

      const generateResponse = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studyGuideRequest)
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to generate study guide')
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

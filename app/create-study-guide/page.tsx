"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import UploadPageRedesigned from "@/components/upload-page-redesigned"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { StreamingGenerationProgress } from "@/components/generation-progress"
import { Toaster } from "@/components/ui/toaster"
import { StudyGuideData } from "@/types"
import { ClientCompression } from "@/lib/client-compression"
import { shouldBypassCloudinary, processFileClientSide } from "@/lib/client-file-processor"
import { useAuth } from "@/lib/auth"

export default function CreateStudyGuidePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const handleGenerateStudyGuide = async (data: StudyGuideData) => {
    setIsGenerating(true)
    setStreamingContent('')
    setStatusMessage('Processing files...')
    setIsComplete(false)

    try {
      const cloudinaryFiles: File[] = []
      const clientProcessFiles: File[] = []

      for (const file of data.files) {
        if (shouldBypassCloudinary(file)) {
          clientProcessFiles.push(file)
        } else {
          cloudinaryFiles.push(file)
        }
      }

      console.log('File processing plan:', {
        cloudinary: cloudinaryFiles.map(f => f.name),
        clientSide: clientProcessFiles.map(f => f.name)
      })

      let cloudinaryUploads: any[] = []
      if (cloudinaryFiles.length > 0) {
        setStatusMessage('Uploading files...')
        cloudinaryUploads = await Promise.all(
          cloudinaryFiles.map(async (file) => {
            return await ClientCompression.uploadToCloudinary(file);
          })
        )
      }

      let clientProcessedContent: Array<{ name: string; content: string }> = []
      if (clientProcessFiles.length > 0) {
        for (const file of clientProcessFiles) {
          setStatusMessage(`Processing ${file.name}...`)
          try {
            const result = await processFileClientSide(file, setStatusMessage)
            if (result.type === 'text' && result.content) {
              clientProcessedContent.push({
                name: file.name,
                content: result.content
              })
            } else if (result.type === 'images' && result.images) {
              console.log(`Converted ${file.name} to ${result.images.length} images`)
              for (let i = 0; i < result.images.length; i++) {
                const img = result.images[i]
                const imageFile = new File([img.data], img.name, { type: 'image/jpeg' })
                const upload = await ClientCompression.uploadToCloudinary(imageFile)
                cloudinaryUploads.push(upload)
              }
            }
          } catch (error) {
            console.error(`Failed to process ${file.name}:`, error)
            throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      setStatusMessage('Files processed! Starting generation...')

      const studyGuideRequest = {
        cloudinaryFiles: cloudinaryUploads.map(upload => ({
          url: upload.url,
          filename: upload.filename,
          size: upload.size,
          format: upload.format
        })),
        directContent: clientProcessedContent.length > 0 ? clientProcessedContent : undefined,
        studyGuideName: data.studyGuideName,
        subject: data.subject,
        gradeLevel: data.gradeLevel,
        format: data.format,
        topicFocus: data.topicFocus,
        difficultyLevel: data.difficultyLevel,
        additionalInstructions: data.additionalInstructions,
        userId: user?.id
      }

      const response = await fetch('/api/generate-study-guide-stream', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studyGuideRequest)
      })

      if (!response.ok) {
        throw new Error('Failed to start generation')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'progress') {
              setStatusMessage(data.message)
            } else if (data.type === 'content') {
              setStreamingContent(prev => prev + data.chunk)
            } else if (data.type === 'complete') {
              setStatusMessage('Complete! Redirecting...')
              setIsComplete(true)
              setTimeout(() => {
                router.push(data.studyGuideUrl)
              }, 1000)
            } else if (data.type === 'error') {
              throw new Error(data.message)
            }
          }
        }
      }

    } catch (error) {
      console.error("Error generating study guide:", error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsGenerating(false)
      setStreamingContent('')
      setStatusMessage('')
    }
  }

  return (
    <AuthGate>
      <main className="min-h-screen bg-background">
        <NavigationHeader />

        {!isGenerating ? (
          <UploadPageRedesigned onGenerateStudyGuide={handleGenerateStudyGuide} isGenerating={isGenerating} />
        ) : (
          <div className="min-h-screen bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 relative overflow-hidden">
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
            <div className="container mx-auto px-4 max-w-4xl relative z-10 py-20">
              <div className="text-center mb-12 text-white">
                <h1 className="text-4xl font-bold mb-2">Generating Your Study Guide</h1>
                <p className="text-blue-100">Sit back and relax while we create your personalized study materials</p>
              </div>
              <StreamingGenerationProgress
                content={streamingContent}
                statusMessage={statusMessage}
                isComplete={isComplete}
              />
            </div>
          </div>
        )}
        <Toaster />
      </main>
    </AuthGate>
  )
}

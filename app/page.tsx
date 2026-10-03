"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import UploadPageRedesigned from "@/components/upload-page-redesigned"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import StudyGuideGenerating from "@/components/study-guide-generating"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { StudyGuideData } from "@/types"
import { ClientCompression } from "@/lib/client-compression"
import { shouldBypassCloudinary, processFileClientSide } from "@/lib/client-file-processor"
import { authFetch } from "@/lib/auth-fetch"
import { isPlanBlock } from "@/lib/plan-rules"
import { usePlan } from "@/components/plan/plan-provider"

export default function Home() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [pending, setPending] = useState<{ title: string; format: string }>({ title: '', format: '' })
  const { toast } = useToast()
  const { openPremium, refresh: refreshPlan } = usePlan()

  const handleGenerateStudyGuide = async (data: StudyGuideData) => {
    setIsGenerating(true)
    setStreamingContent('')
    setStatusMessage(data.files.length ? 'Processing files...' : 'Starting...')
    setIsComplete(false)
    setPending({ title: data.studyGuideName, format: data.format })
    window.scrollTo({ top: 0 })

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

      setStatusMessage(data.files.length ? 'Files processed! Starting generation...' : 'Starting generation...')

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
        studyRequest: data.studyRequest,
        autoTitle: data.autoTitle,
        goal: data.goal,
        sourcePolicy: data.sourcePolicy,
        materialsKind: data.materialsKind,
        planId: data.planId,
        planUnit: data.planUnit,
        visuals: data.visuals,
        length: data.length,
      }

      const response = await authFetch('/api/generate-study-guide-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studyGuideRequest)
      })

      if (!response.ok) {
        const text = await response.text()
        let block: unknown = null
        try { block = JSON.parse(text) } catch { /* SSE-formatted error */ }
        if (isPlanBlock(block)) {
          openPremium(block)
          void refreshPlan()
          setIsGenerating(false)
          setStatusMessage('')
          return
        }
        const sse = text.match(/^data: (.*)$/m)?.[1]
        throw new Error((sse && JSON.parse(sse).message) || 'Failed to start generation')
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
      toast({
        variant: 'destructive',
        title: "Couldn't generate your study guide",
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setIsGenerating(false)
      setStreamingContent('')
      setStatusMessage('')
    }
  }

  return (
    <AuthGate>
      <main className="min-h-screen bg-slate-50">
        <NavigationHeader />

        {!isGenerating ? (
          <UploadPageRedesigned onGenerateStudyGuide={handleGenerateStudyGuide} isGenerating={isGenerating} />
        ) : (
          <StudyGuideGenerating
            title={pending.title}
            format={pending.format}
            content={streamingContent}
            statusMessage={statusMessage}
            isComplete={isComplete}
          />
        )}
        <Toaster />
      </main>
    </AuthGate>
  )
}

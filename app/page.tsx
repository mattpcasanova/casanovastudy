"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import UploadPageRedesigned from "@/components/upload-page-redesigned"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import StudyGuideGenerating from "@/components/study-guide-generating"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { StudyGuideData } from "@/types"
import { uploadFiles } from "@/lib/uploads/client"
import { prepareMaterials } from "@/lib/uploads/prepare"
import { authFetch } from "@/lib/auth-fetch"
import { isPlanBlock } from "@/lib/plan-rules"
import { usePlan } from "@/components/plan/plan-provider"
import { useAuth } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [pending, setPending] = useState<{ title: string; format: string }>({ title: '', format: '' })
  const { toast } = useToast()
  const { openPremium, refresh: refreshPlan } = usePlan()
  const { user } = useAuth()
  // Teachers start on their teaching home (/teach); "/" with any query (?new=1
  // from New Guide, plan units, prefills, ?welcome=1) is the guide maker for them too.
  const [toTeacherHome, setToTeacherHome] = useState(false)
  // The query as the page opened: the form clears it (history.replaceState)
  // when it reads a prefill, which used to bounce teachers to /teach mid-build.
  const openedWith = useRef<string | null>(null)
  if (openedWith.current === null && typeof window !== 'undefined') openedWith.current = window.location.search
  useEffect(() => {
    if (user?.user_type !== 'teacher' || openedWith.current) return
    setToTeacherHome(true)
    router.replace('/teach')
  }, [user, router])

  const handleGenerateStudyGuide = async (data: StudyGuideData) => {
    setIsGenerating(true)
    setStreamingContent('')
    setStatusMessage(data.files.length ? 'Processing files...' : 'Starting...')
    setIsComplete(false)
    setPending({ title: data.studyGuideName, format: data.format })
    window.scrollTo({ top: 0 })

    try {
      // Read and shrink everything in the browser: photos (HEIC too) become JPEGs,
      // scanned PDF pages become images, text-based files become text.
      const prepared = await prepareMaterials(data.files, { onProgress: setStatusMessage })
      if (prepared.problems.length) {
        toast({ title: 'Some files were skipped', description: prepared.problems.join(' ') })
      }
      if (data.files.length && !prepared.texts.length && !prepared.images.length && !data.studyRequest?.trim()) {
        throw new Error('None of your files could be read. ' + prepared.problems.join(' '))
      }

      let imageUploads: Array<{ path: string; name: string }> = []
      if (prepared.images.length) {
        setStatusMessage(prepared.images.length === 1 ? 'Uploading your photo...' : `Uploading ${prepared.images.length} photos and pages...`)
        imageUploads = await uploadFiles(prepared.images.map((i) => ({ blob: i.blob, name: i.name })), 'guide-images', { concurrency: 4 })
      }

      setStatusMessage(data.files.length ? 'Files ready! Starting generation...' : 'Starting generation...')

      const studyGuideRequest = {
        directContent: prepared.texts.length > 0 ? prepared.texts : undefined,
        images: imageUploads.length > 0 ? imageUploads : undefined,
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
        sourceGuideId: data.sourceGuideId,
        language: data.language,
        visuals: data.visuals,
        codeEditor: data.codeEditor,
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

  if (toTeacherHome) return <main className="min-h-screen bg-slate-50" />

  return (
    <AuthGate>
      <main className="min-h-screen bg-slate-50">
        <NavigationHeader />

        {/* The form stays mounted (just hidden) while generating, so if it fails the
            student is back on their filled-in form, banner and all. */}
        <div hidden={isGenerating}>
          <UploadPageRedesigned onGenerateStudyGuide={handleGenerateStudyGuide} isGenerating={isGenerating} />
        </div>
        {isGenerating && (
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

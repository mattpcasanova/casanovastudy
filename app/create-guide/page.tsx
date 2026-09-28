"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import CustomGuideEditor from "@/components/custom-guide-editor/custom-guide-editor"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { customContentToBlocks, EditorBlock, blocksToCustomContent } from "@/lib/types/editor-blocks"
import { CustomGuideContent } from "@/lib/types/custom-guide"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import { signInPath } from '@/lib/sign-in-path'

interface EditGuideData {
  id: string
  title: string
  subject: string
  gradeLevel: string
  className?: string
  customContent: CustomGuideContent | null
}

export default function CreateGuidePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [editData, setEditData] = useState<EditGuideData | null>(null)
  const [loading, setLoading] = useState(!!editId)
  const [error, setError] = useState<string | null>(null)

  // Fetch guide data if editing
  useEffect(() => {
    if (!editId || !user) return

    const fetchGuide = async () => {
      try {
        const response = await authFetch(`/api/study-guides/${editId}/custom-content`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load study guide')
        }

        setEditData({
          id: data.id,
          title: data.title,
          subject: data.subject,
          gradeLevel: data.gradeLevel,
          className: data.className,
          customContent: data.customContent
        })
      } catch (err) {
        console.error('Error fetching guide:', err)
        setError(err instanceof Error ? err.message : 'Failed to load study guide')
      } finally {
        setLoading(false)
      }
    }

    fetchGuide()
  }, [editId, user])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(signInPath())
    }
  }, [authLoading, user, router])

  const handleSave = async (data: {
    title: string
    subject: string
    gradeLevel: string
    className?: string
    customContent: ReturnType<typeof blocksToCustomContent>
  }) => {
    if (!user) return

    const endpoint = editId
      ? `/api/study-guides/${editId}/custom-content`
      : '/api/study-guides/custom'

    const method = editId ? 'PUT' : 'POST'

    const response = await authFetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save study guide')
    }

    router.push(result.studyGuideUrl)
  }

  const handleCancel = () => {
    if (editId) {
      router.push(`/study-guide/${editId}`)
    } else {
      router.push('/my-guides')
    }
  }

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationHeader />
        <div className="h-14 border-b border-slate-200 bg-white" />
        <div className="container mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[560px] w-full rounded-2xl bg-slate-200/70" />
          <Skeleton className="hidden h-[420px] w-full rounded-2xl bg-slate-200/70 lg:block" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {error}
            </h3>
            <p className="text-gray-600 mb-8">
              The study guide could not be loaded. It may not exist or you may not have permission to edit it.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 rounded-xl h-12 px-6">
              <Link href="/my-guides">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Guides
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Convert existing content to editor blocks
  const initialBlocks: EditorBlock[] | undefined = editData?.customContent
    ? customContentToBlocks(editData.customContent)
    : undefined

  const initialMetadata = editData
    ? {
        title: editData.title,
        subject: editData.subject,
        gradeLevel: editData.gradeLevel,
        className: editData.className
      }
    : undefined

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationHeader />
      <CustomGuideEditor
        initialContent={initialBlocks}
        initialMetadata={initialMetadata}
        onSave={handleSave}
        onCancel={handleCancel}
        isEditing={!!editId}
        isTeacher={user?.user_type === 'teacher'}
        draftKey={`custom-guide-draft:${user.id}`}
      />
      <Toaster />
    </div>
  )
}

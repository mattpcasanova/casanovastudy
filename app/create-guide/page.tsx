"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import CustomGuideEditor from "@/components/custom-guide-editor/custom-guide-editor"
import { useAuth } from "@/lib/auth"
import { customContentToBlocks, EditorBlock, blocksToCustomContent } from "@/lib/types/editor-blocks"
import { CustomGuideContent } from "@/lib/types/custom-guide"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft, PenTool, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EditGuideData {
  id: string
  title: string
  subject: string
  gradeLevel: string
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
        const response = await fetch(`/api/study-guides/${editId}/custom-content?userId=${user.id}`, {
          credentials: 'include'
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load study guide')
        }

        setEditData({
          id: data.id,
          title: data.title,
          subject: data.subject,
          gradeLevel: data.gradeLevel,
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
      router.push('/auth/signin')
    }
  }, [authLoading, user, router])

  const handleSave = async (data: {
    title: string
    subject: string
    gradeLevel: string
    customContent: ReturnType<typeof blocksToCustomContent>
  }) => {
    if (!user) return

    const endpoint = editId
      ? `/api/study-guides/${editId}/custom-content`
      : '/api/study-guides/custom'

    const method = editId ? 'PUT' : 'POST'

    const response = await fetch(endpoint, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId: user.id })
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
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <NavigationHeader />
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <Skeleton className="h-12 w-80 mx-auto bg-white/20" />
              <Skeleton className="h-6 w-64 mx-auto bg-white/20" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <NavigationHeader />
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <Skeleton className="h-12 w-64 mx-auto bg-white/20" />
              <Skeleton className="h-6 w-48 mx-auto bg-white/20" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <NavigationHeader />
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                Unable to Load Guide
              </h1>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
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
        gradeLevel: editData.gradeLevel
      }
    : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <NavigationHeader />

      {/* Hero Section - Matching Home Page Style */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">
              {editId ? 'Edit Study Guide' : 'Create Custom Study Guide'}
            </h1>
            <p className="text-lg opacity-90">
              {editId
                ? 'Make changes to your study guide content'
                : 'Build an interactive study guide with blocks'}
            </p>

            {!editId && (
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm pt-2">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <PenTool className="h-5 w-5 text-yellow-300" />
                  <span className="text-white font-medium">Block-based editor</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Sparkles className="h-5 w-5 text-purple-300" />
                  <span className="text-white font-medium">Multiple content types</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Section - Full Width */}
      <div className="container mx-auto px-4 py-8">
        <CustomGuideEditor
          initialContent={initialBlocks}
          initialMetadata={initialMetadata}
          onSave={handleSave}
          onCancel={handleCancel}
          isEditing={!!editId}
        />
      </div>
    </div>
  )
}

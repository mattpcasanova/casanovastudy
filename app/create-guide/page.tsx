"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import CustomGuideEditor from "@/components/custom-guide-editor/custom-guide-editor"
import { useAuth } from "@/lib/auth"
import { customContentToBlocks, EditorBlock, blocksToCustomContent } from "@/lib/types/editor-blocks"
import { CustomGuideContent } from "@/lib/types/custom-guide"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, ArrowLeft } from "lucide-react"
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
  const { user, loading: authLoading, signOut } = useAuth()
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
        const response = await fetch(`/api/study-guides/${editId}/custom-content`)
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
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader user={user} onSignOut={signOut} />
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-8 w-48 bg-white/20" />
            <Skeleton className="h-4 w-64 mt-2 bg-white/20" />
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader user={user} onSignOut={signOut} />
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Error</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {error}
              </h3>
              <p className="text-muted-foreground mb-6">
                The study guide could not be loaded. It may not exist or you may not have permission to edit it.
              </p>
              <Button asChild>
                <Link href="/my-guides">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Guides
                </Link>
              </Button>
            </CardContent>
          </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader user={user} onSignOut={signOut} />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {editId ? 'Edit Study Guide' : 'Create Custom Study Guide'}
            </h1>
            <p className="text-sm opacity-75 mt-1">
              {editId
                ? 'Make changes to your study guide'
                : 'Build an interactive study guide with blocks'}
            </p>
          </div>
        </div>
      </div>

      {/* Editor */}
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

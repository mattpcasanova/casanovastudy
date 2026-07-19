"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import CustomGuideEditor from "@/components/custom-guide-editor/custom-guide-editor"
import { useAuth } from "@/lib/auth"
import { customContentToBlocks, EditorBlock, blocksToCustomContent } from "@/lib/types/editor-blocks"
import { CustomGuideContent } from "@/lib/types/custom-guide"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { displaySerif } from "@/lib/formats/fonts"
import Link from "next/link"

// The four study-guide formats as a chip row — keeps each format's identity
// color (as a dot) so the hero previews what a custom guide can hold, while the
// translucent-white chips sit legibly on the app's blue gradient.
const FORMAT_CHIPS: { label: string; dot: string }[] = [
  { label: "Outline", dot: "bg-blue-300" },
  { label: "Summary", dot: "bg-green-300" },
  { label: "Flashcards", dot: "bg-indigo-300" },
  { label: "Quiz", dot: "bg-purple-300" },
]

function GuideHero({ editId }: { editId: string | null }) {
  return (
    <div className="bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        ></div>
      </div>
      <div className="container mx-auto px-4 py-14 relative">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 mb-2">
            {editId ? "Editing" : "Custom study guide"}
          </p>
          <h1 className={`${displaySerif.variable} font-[family-name:var(--font-display)] text-4xl md:text-5xl font-semibold`}>
            {editId ? "Edit your study guide" : "Build a study guide, your way"}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-blue-50/90">
            {editId
              ? "Refine your guide — add, rearrange, and rewrite content by hand or with AI."
              : "Mix flashcards, outlines, summaries, and quizzes in one guide. Build it by hand, or let AI draft it from your instructions or uploaded materials."}
          </p>
          {!editId && (
            <div className="mt-6 flex flex-wrap gap-2">
              {FORMAT_CHIPS.map(({ label, dot }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-inset ring-white/20"
                >
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
      router.push('/auth/signin')
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
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <NavigationHeader />
        <GuideHero editId={editId} />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <NavigationHeader />
        <GuideHero editId={editId} />
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
        gradeLevel: editData.gradeLevel,
        className: editData.className
      }
    : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <NavigationHeader />

      <GuideHero editId={editId} />

      {/* Editor Section - Full Width */}
      <div className="container mx-auto px-4 py-8">
        <CustomGuideEditor
          initialContent={initialBlocks}
          initialMetadata={initialMetadata}
          onSave={handleSave}
          onCancel={handleCancel}
          isEditing={!!editId}
          isTeacher={user?.user_type === 'teacher'}
        />
      </div>
    </div>
  )
}

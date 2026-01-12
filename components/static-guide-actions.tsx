"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"
import { BookmarkPlus, Home, Loader2 } from "lucide-react"

interface StaticGuideActionsProps {
  guideId: string // Unique identifier for the static guide (e.g., "marinescience-exam2")
  title: string
  subject: string
  gradeLevel: string
  staticRoute: string // The route path (e.g., "/marinescience/exam2-earthprocesses")
}

export function StaticGuideActions({
  guideId,
  title,
  subject,
  gradeLevel,
  staticRoute
}: StaticGuideActionsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const handleSaveToMyGuides = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save guides to your collection.",
        variant: "destructive"
      })
      router.push("/auth/signin")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/study-guides/save-static", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId,
          title,
          subject,
          gradeLevel,
          staticRoute,
          userId: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === "Guide already saved") {
          toast({
            title: "Already saved",
            description: "This guide is already in your collection."
          })
        } else {
          throw new Error(data.error || "Failed to save guide")
        }
        return
      }

      toast({
        title: "Saved!",
        description: "Guide added to your collection."
      })
    } catch (error) {
      console.error("Error saving guide:", error)
      toast({
        title: "Error",
        description: "Failed to save guide. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <Button
        onClick={handleSaveToMyGuides}
        disabled={saving}
        className="shadow-lg"
        size="lg"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        ) : (
          <BookmarkPlus className="h-5 w-5 mr-2" />
        )}
        Save to My Guides
      </Button>
      <Button
        variant="outline"
        onClick={() => router.push("/")}
        className="shadow-lg bg-white"
        size="lg"
      >
        <Home className="h-5 w-5 mr-2" />
        Home
      </Button>
    </div>
  )
}

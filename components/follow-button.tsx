"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, UserMinus, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

interface FollowButtonProps {
  teacherId: string
  initialIsFollowing?: boolean
  onFollowChange?: (isFollowing: boolean) => void
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline"
}

export function FollowButton({
  teacherId,
  initialIsFollowing = false,
  onFollowChange,
  size = "default",
  variant = "default"
}: FollowButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleFollow = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow teachers",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/follows/${teacherId}`, {
          method: "DELETE"
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to unfollow")
        }

        setIsFollowing(false)
        onFollowChange?.(false)
        toast({
          title: "Unfollowed",
          description: "You will no longer see this teacher's guides in your feed"
        })
      } else {
        // Follow
        const response = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to follow")
        }

        setIsFollowing(true)
        onFollowChange?.(true)
        toast({
          title: "Following",
          description: "You will now see this teacher's published guides in your feed"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show button if user is viewing their own profile
  if (user?.id === teacherId) {
    return null
  }

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={isLoading}
      size={size}
      variant={isFollowing ? "outline" : variant}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  )
}

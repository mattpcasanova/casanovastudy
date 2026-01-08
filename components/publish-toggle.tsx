"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Globe, Lock, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PublishToggleProps {
  guideId: string
  initialIsPublished?: boolean
  onPublishChange?: (isPublished: boolean) => void
  variant?: "switch" | "button"
  showLabel?: boolean
}

export function PublishToggle({
  guideId,
  initialIsPublished = false,
  onPublishChange,
  variant = "switch",
  showLabel = true
}: PublishToggleProps) {
  const { toast } = useToast()
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)

    try {
      const endpoint = isPublished
        ? `/api/study-guides/${guideId}/unpublish`
        : `/api/study-guides/${guideId}/publish`

      const response = await fetch(endpoint, {
        method: "POST"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update publish status")
      }

      const newStatus = !isPublished
      setIsPublished(newStatus)
      onPublishChange?.(newStatus)

      toast({
        title: newStatus ? "Published" : "Unpublished",
        description: newStatus
          ? "Your study guide is now visible to your followers"
          : "Your study guide is now private"
      })
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

  if (variant === "button") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggle}
              disabled={isLoading}
              variant={isPublished ? "outline" : "default"}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPublished ? (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Published
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Private
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPublished
              ? "Click to make this guide private"
              : "Click to publish this guide to your followers"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Switch
        id={`publish-${guideId}`}
        checked={isPublished}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      {showLabel && (
        <Label
          htmlFor={`publish-${guideId}`}
          className="flex items-center gap-2 text-sm cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPublished ? (
            <>
              <Globe className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Published</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Private</span>
            </>
          )}
        </Label>
      )}
    </div>
  )
}

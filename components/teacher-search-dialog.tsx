"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TeacherCard } from "@/components/teacher-card"
import { Search, Users, Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Teacher {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  bio?: string
  guideCount?: number
  followerCount?: number
}

interface TeacherSearchDialogProps {
  trigger?: React.ReactNode
  followedTeacherIds?: string[]
  onFollowChange?: (teacherId: string, isFollowing: boolean) => void
}

export function TeacherSearchDialog({
  trigger,
  followedTeacherIds = [],
  onFollowChange
}: TeacherSearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showBrowse, setShowBrowse] = useState(true)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const searchTeachers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setShowBrowse(true)
      return
    }

    setIsLoading(true)
    setShowBrowse(false)

    try {
      const response = await fetch(`/api/teachers/search?q=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()

      if (response.ok) {
        setTeachers(data.teachers || [])
      }
    } catch (error) {
      console.error("Error searching teachers:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const browseTeachers = useCallback(async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/teachers?limit=20")
      const data = await response.json()

      if (response.ok) {
        setTeachers(data.teachers || [])
      }
    } catch (error) {
      console.error("Error fetching teachers:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedSearch) {
      searchTeachers(debouncedSearch)
    } else if (open && showBrowse) {
      browseTeachers()
    }
  }, [debouncedSearch, open, showBrowse, searchTeachers, browseTeachers])

  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setShowBrowse(true)
      browseTeachers()
    }
  }, [open, browseTeachers])

  const handleFollowChange = (teacherId: string, isFollowing: boolean) => {
    onFollowChange?.(teacherId, isFollowing)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Find Teachers
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Find Teachers to Follow
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-3 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery
                ? "No teachers found matching your search"
                : "No teachers with public profiles yet"}
            </div>
          ) : (
            teachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                isFollowing={followedTeacherIds.includes(teacher.id)}
                onFollowChange={(isFollowing) => handleFollowChange(teacher.id, isFollowing)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

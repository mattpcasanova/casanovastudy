"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { FollowButton } from "@/components/follow-button"
import { BookOpen } from "lucide-react"

interface TeacherCardProps {
  teacher: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    display_name?: string
    bio?: string
    guideCount?: number
  }
  isFollowing?: boolean
  onFollowChange?: (isFollowing: boolean) => void
  showFollowButton?: boolean
}

export function TeacherCard({
  teacher,
  isFollowing = false,
  onFollowChange,
  showFollowButton = true
}: TeacherCardProps) {
  const displayName = teacher.display_name ||
    (teacher.first_name && teacher.last_name
      ? `${teacher.first_name} ${teacher.last_name}`
      : teacher.first_name || teacher.email.split("@")[0])

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Link href={`/teacher/${teacher.id}`}>
            <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/teacher/${teacher.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {displayName}
                </Link>
                {teacher.guideCount !== undefined && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    {teacher.guideCount} {teacher.guideCount === 1 ? "guide" : "guides"}
                  </div>
                )}
              </div>

              {showFollowButton && (
                <FollowButton
                  teacherId={teacher.id}
                  initialIsFollowing={isFollowing}
                  onFollowChange={onFollowChange}
                  size="sm"
                />
              )}
            </div>

            {teacher.bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {teacher.bio}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

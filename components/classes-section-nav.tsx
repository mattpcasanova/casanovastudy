"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, School, CalendarDays, Plus, ClipboardCheck } from "lucide-react"
import { useAuth } from "@/lib/auth"

// Sub-nav for the classes section. Rendered at the top of /dashboard, /calendar,
// /my-classes (student), /teacher/classes, and /classes/join. The buttons stay
// visible while navigating between them so it feels like one workspace.
export default function ClassesSectionNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const isTeacher = user?.user_type === "teacher"
  const myClassesHref = isTeacher ? "/teacher/classes" : "/my-classes"

  const items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; match: (p: string | null) => boolean }> = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      match: p => p === "/" || (!!p && p.startsWith("/dashboard")),
    },
    {
      href: myClassesHref,
      label: "My Classes",
      icon: School,
      match: p => !!p && (
        isTeacher
          ? p.startsWith("/teacher/classes")
          : p.startsWith("/my-classes") || (p.startsWith("/classes/") && !p.startsWith("/classes/join"))
      ),
    },
    {
      href: "/calendar",
      label: "Calendar",
      icon: CalendarDays,
      match: p => !!p && p.startsWith("/calendar"),
    },
  ]

  if (isTeacher) {
    items.push({
      href: "/teacher/practice-tests",
      label: "Practice Tests",
      icon: ClipboardCheck,
      match: p => !!p && p.startsWith("/teacher/practice-tests"),
    })
  } else {
    items.push({
      href: "/classes/join",
      label: "Join Class",
      icon: Plus,
      match: p => !!p && p.startsWith("/classes/join"),
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      {items.map(item => {
        const active = item.match(pathname)
        const Icon = item.icon
        return (
          <Button
            key={item.href}
            asChild
            variant={active ? "default" : "outline"}
            size="sm"
          >
            <Link href={item.href}>
              <Icon className="h-4 w-4 mr-2" />
              {item.label}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}

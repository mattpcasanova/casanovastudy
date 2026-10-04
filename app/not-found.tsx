"use client"

import { usePathname } from "next/navigation"
import { BookOpen, Home, Sparkles, Undo2 } from "lucide-react"
import { StatusPage, type StatusAction } from "@/components/status-page"
import { useAuth } from "@/lib/auth"

export default function NotFound() {
  const pathname = usePathname() ?? ""
  const { user } = useAuth()
  const isGuide = pathname.startsWith("/study-guide/")

  const actions: StatusAction[] = [
    { label: "Make a study guide", href: "/", icon: Sparkles, primary: true },
    user
      ? { label: "My Guides", href: "/my-guides", icon: BookOpen }
      : { label: "Home", href: "/", icon: Home },
    { label: "Go back", icon: Undo2, onClick: () => (history.length > 1 ? history.back() : location.assign("/")) },
  ]

  return (
    <>
    <title>{isGuide ? "Guide not found | Casanova Study" : "Page not found | Casanova Study"}</title>
    <StatusPage
      eyebrow="404 · Page not found"
      title={isGuide ? "This guide isn't here" : "We couldn't find that page"}
      message={isGuide ? (
        <>
          <p>The study guide at this link was deleted, or the link was copied incompletely.</p>
          <p>If someone shared it with you, ask them to send it again. Or make your own in about a minute.</p>
        </>
      ) : (
        <>
          <p>The link may be mistyped, or the page has moved.</p>
          <p>Everything you’ve made is still in My Guides.</p>
        </>
      )}
      actions={actions}
      footer={<>Think something’s broken? Email <a href="mailto:hello@casanovastudy.com" className="font-semibold text-blue-700 hover:underline">hello@casanovastudy.com</a>.</>}
    />
    </>
  )
}

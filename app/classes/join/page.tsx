"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2, School } from "lucide-react"

function JoinClassInner() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Prefill from ?code= (QR codes embed the code in the URL)
  useEffect(() => {
    const fromQuery = searchParams?.get("code")
    if (fromQuery) {
      setCode(fromQuery.trim().toUpperCase().slice(0, 6))
    }
  }, [searchParams])

  // Auth gating: signed-out → signin with returnTo; teachers → bounce home
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const fromQuery = searchParams?.get("code") ?? ""
      const returnTo = `/classes/join${fromQuery ? `?code=${encodeURIComponent(fromQuery)}` : ""}`
      router.push(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }
    if (user.user_type !== "student") {
      toast({ title: "Only students can join classes", variant: "destructive" })
      router.push("/")
    }
  }, [authLoading, user, router, searchParams, toast])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = code.trim().toUpperCase()
    if (!/^[A-Z2-9]{6}$/.test(cleaned)) {
      toast({ title: "Enter a valid 6-character class code", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleaned }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Could not join class", variant: "destructive" })
        return
      }
      toast({ title: json.rejoined ? `Rejoined ${json.class.name}` : `Joined ${json.class.name}` })
      router.push("/my-classes")
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !user || user.user_type !== "student") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <School className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Join a Class</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter the 6-character code your teacher shared with you.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="enrollment-code">Class code</Label>
              <Input
                id="enrollment-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-2xl tracking-[0.4em] text-center h-14"
              />
              <p className="text-xs text-muted-foreground">Codes are 6 characters, uppercase letters and numbers (no 0, 1, I, L, or O).</p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Join class
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinClassPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 pt-8">
        <ClassesSectionNav />
      </div>
      <Suspense fallback={
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-48" />
        </div>
      }>
        <JoinClassInner />
      </Suspense>
    </div>
  )
}

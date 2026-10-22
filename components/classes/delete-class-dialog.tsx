"use client"

// Delete a class (a bad or doubled import). Says what goes and what stays
// before anything happens: graded papers are kept in My Reports.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth-fetch"
import { actionButton } from "@/components/grading/grading-ui"

interface Preview { students: number; papers: number; sets: number; practice: number }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function DeleteClassDialog({ classId, label, open, onOpenChange }: { classId: string; label: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setPreview(null)
    setError("")
    void (async () => {
      const res = await authFetch(`/api/classes/${classId}?preview=1`, { method: "DELETE" })
      if (res.ok) setPreview(await res.json())
      else setError("Could not check this class. Try again.")
    })()
  }, [open, classId])

  const remove = async () => {
    setBusy(true)
    setError("")
    const res = await authFetch(`/api/classes/${classId}`, { method: "DELETE" })
    if (!res.ok) {
      setBusy(false)
      setError("Could not delete the class. Try again.")
      return
    }
    router.push("/teacher/classes")
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-slate-600">
              {!preview && !error ? (
                <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking what&apos;s in this class…</p>
              ) : preview ? (
                <>
                  <p>This removes the class list ({plural(preview.students, "student")}), its join code{preview.practice ? ` and ${plural(preview.practice, "practice assignment")}` : ""}. It can&apos;t be undone.</p>
                  {preview.papers > 0 ? (
                    <p className="rounded-xl bg-amber-50 p-3 text-amber-900 ring-1 ring-inset ring-amber-200">
                      {plural(preview.papers, "graded paper")} in {plural(preview.sets, "class set")} will be kept in My Reports with their scores, but won&apos;t be tied to a class anymore. If this is the class you grade in, keep it and delete the copy instead.
                    </p>
                  ) : (
                    <p>Nothing has been graded in this class.</p>
                  )}
                </>
              ) : null}
              {error && <p className="text-rose-700">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={actionButton} disabled={busy}>Keep the class</AlertDialogCancel>
          <Button onClick={() => void remove()} disabled={busy || !preview} className="h-10 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete class
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

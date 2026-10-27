"use client"

// Regrade every paper in a class set, optionally against a new answer key
// (the teacher uploaded the wrong one, or none, and wants everyone marked
// against the right one). The key is prepared and uploaded like the batch
// grader's, saved on the set (PATCH { markScheme }), then each report is
// regraded through POST /api/grade-exam/[id]/regrade, first one alone, then
// three at a time, with progress. Asks before starting: it replaces marks.

import { useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { uploadFile } from "@/lib/uploads/client"
import { prepareMaterials } from "@/lib/uploads/prepare"
import { UPLOAD_ACCEPT } from "@/lib/uploads/kinds"
import { cn } from "@/lib/utils"

export interface RegradablePaper { id: string; name: string; hasPages: boolean }

export function RegradeSetDialog({ open, onOpenChange, batchId, papers, onDone }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: string
  papers: RegradablePaper[]
  onDone: () => void
}) {
  const [keyFiles, setKeyFiles] = useState<File[]>([])
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [status, setStatus] = useState("")
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null)
  const [error, setError] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const ready = papers.filter((p) => p.hasPages)
  const noPages = papers.filter((p) => !p.hasPages)

  useEffect(() => { if (open) { setKeyFiles([]); setNote(""); setConfirm(false); setStatus(""); setProgress(null); setError("") } }, [open])

  const run = async () => {
    setError("")
    setProgress({ done: 0, total: ready.length, failed: [] })
    try {
      if (keyFiles.length) {
        setStatus("Reading the answer key…")
        const prepared = await prepareMaterials(keyFiles, { pdfMode: "auto", maxImages: 30, onProgress: setStatus })
        const images: Array<{ path: string; name: string }> = []
        for (const img of prepared.images) {
          setStatus(`Uploading answer key page ${images.length + 1} of ${prepared.images.length}…`)
          const up = await uploadFile(img.blob, "grading-mark-schemes", img.name)
          images.push({ path: up.path, name: img.name })
        }
        if (!prepared.texts.length && !images.length) throw new Error("That answer key couldn't be read. " + prepared.problems.join(" "))
        const res = await authFetch(`/api/grade-batch/${batchId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markScheme: { texts: prepared.texts, images } }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Could not save the answer key")
      }
      setStatus("")
      const failed: string[] = []
      let done = 0
      const one = async (p: RegradablePaper) => {
        const res = await authFetch(`/api/grade-exam/${p.id}/regrade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) })
        if (!res.ok) failed.push(p.name)
        done++
        setProgress({ done, total: ready.length, failed: [...failed] })
      }
      // The first paper alone writes the prompt cache for the rest.
      if (ready[0]) await one(ready[0])
      let next = 1
      const worker = async () => { while (next < ready.length) await one(ready[next++]) }
      await Promise.all([worker(), worker(), worker()])
      onDone()
      if (!failed.length) onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not regrade")
      setProgress(null)
    }
  }

  const running = !!progress && progress.done < progress.total && !error
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!running) onOpenChange(o) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Regrade all papers</DialogTitle>
          <DialogDescription>Every paper is graded again from its pages. New marks and feedback replace the current ones (edits you made to reports are lost; extra credit stays). About a minute per paper, three at a time.</DialogDescription>
        </DialogHeader>
        {!progress && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Answer key</p>
              <p className="text-sm text-slate-600">Keep the set&apos;s current answer key, or upload a different one to mark everyone against.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => input.current?.click()} className={actionButton}><Upload />{keyFiles.length ? "Choose a different file" : "Upload a new answer key"}</button>
                {keyFiles.length > 0 && <span className="text-sm text-slate-700">{keyFiles.map((f) => f.name).join(", ")} <button type="button" className="font-medium text-blue-700 hover:underline" onClick={() => setKeyFiles([])}>remove</button></span>}
                <input ref={input} type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => { if (e.target.files?.length) setKeyFiles(Array.from(e.target.files)); e.target.value = "" }} />
              </div>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-slate-800">Tell the grader what to look at (optional)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Accept 'bent' without an angle for 31d." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base" />
            </label>
            {noPages.length > 0 && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{noPages.length} report{noPages.length === 1 ? " has" : "s have"} no saved pages and will be left as {noPages.length === 1 ? "it is" : "they are"}: {noPages.map((p) => p.name).join(", ")}.</p>}
            {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
              <span>Replace the marks on {ready.length} report{ready.length === 1 ? "" : "s"}{keyFiles.length ? " using the new answer key" : ""}.</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={actionButton} onClick={() => onOpenChange(false)}>Cancel</button>
              <button type="button" className={cn(actionButtonPrimary)} disabled={!confirm || !ready.length} onClick={() => void run()}><RefreshCw />Regrade {ready.length} paper{ready.length === 1 ? "" : "s"}</button>
            </div>
          </div>
        )}
        {progress && (
          <div className="space-y-3" role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">{running ? <Loader2 className="h-4 w-4 animate-spin text-blue-700" /> : null}{status || `Regraded ${progress.done} of ${progress.total}`}</p>
            <div className="h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-700 transition-[width] duration-500" style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} /></div>
            {progress.failed.length > 0 && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">Couldn&apos;t regrade: {progress.failed.join(", ")}. Open those reports and try Regrade there.</p>}
            {!running && <div className="flex justify-end"><button type="button" className={actionButton} onClick={() => onOpenChange(false)}>Close</button></div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

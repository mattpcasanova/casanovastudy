"use client"

// "Print name-stamped copies": upload the blank test PDF, pick classes, and
// download one print-ready PDF per class with each student's name, page
// number and a QR code on every page. Scans of these sort themselves in the
// batch grader (no name reading), across classes and in any order.

import { useEffect, useRef, useState } from "react"
import { Download, FileUp, Loader2, QrCode } from "lucide-react"
import { PDFDocument } from "pdf-lib"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authFetch } from "@/lib/auth-fetch"
import { stampTest, type StampCorner } from "@/lib/stamped/stamp-pdf"

interface ClassOption { id: string; name: string; period: string | null; roster_count?: number }

const CORNERS: Array<[StampCorner, string]> = [["top-right", "Top right"], ["bottom-right", "Bottom right"], ["top-left", "Top left"], ["bottom-left", "Bottom left"]]

export function StampTestDialog({ open, onOpenChange, defaultClassId }: { open: boolean; onOpenChange: (open: boolean) => void; defaultClassId: string }) {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set([defaultClassId]))
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState(0)
  const [title, setTitle] = useState("")
  const [corner, setCorner] = useState<StampCorner>("top-right")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Array<{ name: string; url: string; file: string }>>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setPicked(new Set([defaultClassId]))
    void (async () => {
      const res = await fetch("/api/classes")
      const data = await res.json().catch(() => ({}))
      if (res.ok) setClasses(data.classes ?? [])
    })()
  }, [open, defaultClassId])

  useEffect(() => () => done.forEach((d) => URL.revokeObjectURL(d.url)), [done])

  const choose = async (f: File | undefined) => {
    setError("")
    setDone([])
    if (!f) return
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { setError("Choose the test as a PDF (in Word or Google Docs: File, then Download or Save As, then PDF)."); return }
    try {
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
      setPages(doc.getPageCount())
      setFile(f)
      if (!title) setTitle(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "))
    } catch {
      setError("That PDF couldn't be opened. If it's password-protected, save an unlocked copy first.")
    }
  }

  const generate = async () => {
    if (!file || !picked.size) return
    setBusy(true)
    setError("")
    setDone([])
    try {
      setStatus("Making a copy for each student...")
      const res = await authFetch("/api/stamped-tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, pages, classIds: [...picked] }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not start the test")
      const blank = await file.arrayBuffer()
      const out: typeof done = []
      for (const cls of data.classes as Array<{ name: string; period: string | null; copies: Array<{ code: string; name: string }> }>) {
        const label = cls.period ? `${cls.name} P${cls.period}` : cls.name
        const bytes = await stampTest(blank, cls.copies, { title, className: label, corner, onProgress: (d, t) => setStatus(`Stamping ${label}: ${d} of ${t} students...`) })
        const name = `${title} - ${label}.pdf`.replace(/[\\/:*?"<>|]+/g, " ")
        out.push({ name: label, file: name, url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })) })
      }
      setDone(out)
      setStatus("")
      // Start the first download right away; the rest are links below.
      const a = document.createElement("a")
      a.href = out[0].url
      a.download = out[0].file
      a.click()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-blue-600" />Print name-stamped copies</DialogTitle>
          <DialogDescription>
            Each student gets their own copy with their name, page number and a small code on every page. Scan the finished tests in any order, even several classes in one pile, and every page goes to the right student automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void choose(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full border-dashed py-6" disabled={busy}>
            <FileUp className="mr-2 h-5 w-5" />{file ? `${file.name} (${pages} page${pages === 1 ? "" : "s"})` : "Choose the blank test (PDF)"}
          </Button>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Test name</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unit 3 test" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>

          <div className="text-sm">
            <p className="mb-1 font-medium text-slate-700">Classes</p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={picked.has(c.id)}
                    onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-slate-800">{c.name}{c.period ? ` (P${c.period})` : ""}</span>
                  {c.roster_count != null && <span className="text-xs text-slate-400">{c.roster_count} students</span>}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Stamp in the</span>
            <select value={corner} onChange={(e) => setCorner(e.target.value as StampCorner)} className="rounded-lg border border-slate-200 px-2 py-1.5">
              {CORNERS.map(([v, l]) => <option key={v} value={v}>{l.toLowerCase()}</option>)}
            </select>
            <span className="text-xs text-slate-500">corner (pick one with blank space on every page)</span>
          </label>

          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {status && <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />{status}</p>}

          {done.length > 0 && (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-medium">Ready to print. Print single-sided or double-sided, either works.</p>
              <ul className="mt-1 space-y-1">
                {done.map((d) => (
                  <li key={d.url}><a href={d.url} download={d.file} className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline"><Download className="h-3.5 w-3.5" />{d.name}</a></li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-emerald-800">When they come back, scan them (copier or phone) and drop them into Grade a Class. The codes do the sorting.</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={generate} disabled={busy || !file || !picked.size} className="bg-blue-600 hover:bg-blue-700">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Working…</> : `Make ${picked.size} PDF${picked.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

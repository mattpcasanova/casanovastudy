"use client"

// "Class materials" on a class page (migration 080): slides and notes students
// in the class can build study guides from without downloading anything. Each
// file is prepared here in the teacher's browser (prepareMaterials): its text
// goes to the server, scanned pages to the teacher's uploads folder.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, Check, FileText, Loader2, Plus, Presentation, Upload, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropZone, FileList, actionButtonPrimary } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { sortClasses } from "@/lib/classes/sort"
import { schoolYearFor } from "@/lib/classes/years"
import { MATERIAL_LIMITS, materialTitle } from "@/lib/classes/materials"
import { UPLOAD_ACCEPT } from "@/lib/uploads/kinds"
import { prepareMaterials } from "@/lib/uploads/prepare"
import { uploadFiles } from "@/lib/uploads/client"
import { DrivePickButton } from "@/components/drive-pick-button"

interface Material {
  id: string; materialId: string; name: string; kind: string; note: string | null; createdAt: string
  guides: number; otherClasses: Array<{ id: string; name: string; period: string | null }>
}
interface ClassOption { id: string; name: string; period: string | null; is_archived?: boolean; school_year?: string | null }

const classLabel = (c: { name: string; period: string | null }) => (c.period ? `${c.name} (Period ${c.period})` : c.name)

export function ClassMaterialsList({ classId }: { classId: string }) {
  const [list, setList] = useState<Material[] | null>(null)
  const [adding, setAdding] = useState(false)
  const load = async () => {
    const res = await authFetch(`/api/class-materials?classId=${classId}`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setList(data.materials ?? [])
  }
  useEffect(() => { void load() }, [classId]) // eslint-disable-line react-hooks/exhaustive-deps
  const remove = async (m: Material) => {
    setList((prev) => prev?.filter((x) => x.id !== m.id) ?? null)
    await authFetch("/api/class-materials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId: m.id }) })
    void load()
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Class materials</h2>
          <p className="text-sm text-slate-500">Slides and notes your students can make study guides from, with no downloading. They see the file name, not the file.</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className={actionButtonPrimary}><Plus />Add class materials</button>
      </div>
      {list === null ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
      ) : list.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nothing here yet. Add the slides you post on Google Classroom, and students can pick them when they make a guide.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((m) => {
            const Icon = m.kind === "slides" ? Presentation : FileText
            const also = m.otherClasses.map((c) => (c.period ? `P${c.period}` : c.name))
            return (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">{materialTitle(m.name)}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {[
                      m.guides ? `Used in ${m.guides} guide${m.guides === 1 ? "" : "s"}` : "Not used yet",
                      also.length ? `Also in ${also.join(", ")}` : null,
                      m.note,
                      new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
                    ].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <button type="button" onClick={() => void remove(m)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={`Remove ${m.name} from this class`}><X className="h-4 w-4" /></button>
              </li>
            )
          })}
        </ul>
      )}
      <AddMaterialsDialog open={adding} onOpenChange={setAdding} classId={classId} onAdded={load} />
    </section>
  )
}

type FileState = { status: "waiting" | "working" | "done" | "failed"; message?: string }

function AddMaterialsDialog({ open, onOpenChange, classId, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; classId: string; onAdded: () => void | Promise<void> }) {
  const [classes, setClasses] = useState<ClassOption[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set([classId]))
  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState("")
  const [states, setStates] = useState<FileState[]>([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setPicked(new Set([classId])); setFiles([]); setNote(""); setStates([])
    if (classes) return
    void (async () => {
      const res = await authFetch("/api/classes", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const year = schoolYearFor()
      const list = ((data.classes ?? []) as ClassOption[]).filter((c) => !c.is_archived && (!c.school_year || c.school_year === year))
      setClasses(sortClasses(list.map((c) => ({ ...c, period: c.period ?? null }))))
    })()
  }, [open, classId]) // eslint-disable-line react-hooks/exhaustive-deps

  const setState = (i: number, s: FileState) => setStates((prev) => { const n = [...prev]; n[i] = s; return n })

  const add = async () => {
    if (!files.length || !picked.size) return
    setBusy(true)
    setStates(files.map(() => ({ status: "waiting" })))
    let added = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        setState(i, { status: "working", message: "Reading…" })
        const prepared = await prepareMaterials([file], { maxImages: MATERIAL_LIMITS.maxImages, onProgress: (m) => setState(i, { status: "working", message: m }) })
        const content = prepared.texts.map((t) => t.content).join("\n\n").trim()
        if (!content && !prepared.images.length) throw new Error(prepared.problems.join(" ") || "Nothing could be read from this file.")
        let images: Array<{ path: string; name: string }> = []
        if (prepared.images.length) {
          setState(i, { status: "working", message: `Uploading ${prepared.images.length} page${prepared.images.length === 1 ? "" : "s"}…` })
          images = (await uploadFiles(prepared.images.map((p) => ({ blob: p.blob, name: p.name })), "class-materials", { concurrency: 4 })).map((u) => ({ path: u.path, name: u.name }))
        }
        setState(i, { status: "working", message: "Saving…" })
        const res = await authFetch("/api/class-materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, content, images, classIds: [...picked], note }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Could not save it")
        setState(i, { status: "done" })
        added++
      } catch (e) {
        setState(i, { status: "failed", message: e instanceof Error ? e.message : "Could not add it" })
      }
    }
    setBusy(false)
    if (added) await onAdded()
    if (added === files.length) onOpenChange(false)
  }

  const allIds = (classes ?? []).map((c) => c.id)
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }}>
      {/* One column that never grows past the dialog: long file names truncate instead of scrolling sideways. */}
      <DialogContent className="max-w-lg grid-cols-[minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle className="text-xl">Add class materials</DialogTitle>
          <DialogDescription>Students in these classes can pick them when they make a study guide. Old .ppt files: save them as .pptx or PDF first.</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          {states.length === 0 ? (
            <>
              <DropZone compact label={files.length ? "Add more files" : "Choose slides or notes"} onBrowse={() => inputRef.current?.click()} hasFiles={files.length > 0} disabled={busy} />
              <input ref={inputRef} type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => { if (e.target.files?.length) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]); e.target.value = "" }} />
              {/* Slides already on Google Classroom live in the teacher's Drive (its Classroom folder). */}
              <DrivePickButton onFiles={(picked) => setFiles((prev) => [...prev, ...picked])} disabled={busy} />
              {files.length > 0 && <FileList files={files} onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))} disabled={busy} />}
            </>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f, i) => {
                const st = states[i] ?? { status: "waiting" }
                return (
                  <li key={`${f.name}-${i}`} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm", st.status === "failed" ? "bg-rose-50 text-rose-900" : st.status === "done" ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-800")}>
                    {st.status === "done" ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : st.status === "failed" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" /> : st.status === "working" ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-700" /> : <Upload className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{f.name}</span>
                      {st.message && <span className="block text-xs opacity-80">{st.message}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          {!classes ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your classes…</p>
          ) : classes.length > 1 && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Classes</p>
                <button type="button" onClick={() => setPicked(picked.size === allIds.length ? new Set([classId]) : new Set(allIds))} disabled={busy} className="text-xs font-semibold text-blue-700 hover:underline">{picked.size === allIds.length ? "Just this one" : "All of them"}</button>
              </div>
              <ul className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {classes.map((c) => {
                  const on = picked.has(c.id)
                  return (
                    <li key={c.id}>
                      <label className={cn("flex h-10 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm", on ? "bg-blue-50 text-blue-900 ring-1 ring-blue-200" : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50")}>
                        <input type="checkbox" checked={on} disabled={busy} onChange={() => setPicked((prev) => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })} className="h-4 w-4 rounded border-slate-300" />
                        <span className="min-w-0 flex-1 truncate">{classLabel(c)}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-800">A note for them <span className="font-normal text-slate-500">(optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} disabled={busy} placeholder="Unit 4: what's on Friday's test" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>

          {states.some((s) => s.status === "failed") && !busy ? (
            <button type="button" onClick={() => { setFiles(files.filter((_, i) => states[i]?.status === "failed")); setStates([]) }} className={cn(actionButtonPrimary, "w-full")}>Try the failed ones again</button>
          ) : (
            <button type="button" onClick={() => void add()} disabled={busy || !files.length || !picked.size} className={cn(actionButtonPrimary, "w-full")}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              {busy ? "Adding…" : picked.size > 1 ? `Add to ${picked.size} classes` : "Add to this class"}
            </button>
          )}
          {classes && classes.length === 0 && <p className="text-sm text-slate-600"><Link href="/teacher/classes" className="font-semibold text-blue-700 hover:underline">Add a class</Link> first.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

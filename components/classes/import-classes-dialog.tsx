"use client"

// One-time import of every class from a gradebook export: pick the CSV (or
// paste the columns), check the classes it found, import. Classes with the same
// name and period get the new names added instead of a duplicate class.

import { useMemo, useRef, useState } from "react"
import { FileUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authFetch } from "@/lib/auth-fetch"
import { parseClassImport } from "@/lib/classes/import"
import { RosterFileHelp } from "./roster-file-help"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { cn } from "@/lib/utils"

const SPREADSHEET = /\.(xlsx|xls|numbers|ods)$/i

export function ImportClassesDialog({ open, onOpenChange, onImported }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (summary: string) => void
}) {
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => (text.trim() ? parseClassImport(text, "Imported class") : null), [text])
  const total = preview?.classes.reduce((s, c) => s + c.students.length, 0) ?? 0

  const pickFile = async (file: File | undefined) => {
    setError("")
    if (!file) return
    if (SPREADSHEET.test(file.name)) {
      setError("Save the spreadsheet as CSV first (File, then Save As or Download, then CSV), or copy the columns and paste them below.")
      return
    }
    setFileName(file.name)
    setText(await file.text())
  }

  const doImport = async () => {
    setBusy(true)
    setError("")
    try {
      const res = await authFetch("/api/classes/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, fallbackName: "Imported class" }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Import failed")
      const made = data.classes.filter((c: { created: boolean }) => c.created).length
      const added = data.classes.reduce((s: number, c: { added: number }) => s + c.added, 0)
      const filled = data.classes.reduce((s: number, c: { filled?: number }) => s + (c.filled ?? 0), 0)
      onImported(`Imported ${added} student${added === 1 ? "" : "s"} into ${data.classes.length} class${data.classes.length === 1 ? "" : "es"}${made < data.classes.length ? ` (${data.classes.length - made} already existed, new names added)` : ""}.${filled ? ` Filled in student IDs or emails for ${filled} student${filled === 1 ? "" : "s"} already on your lists.` : ""}`)
      setText("")
      setFileName("")
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import your classes</DialogTitle>
          <DialogDescription>
            Export your class lists from your gradebook (Focus, PowerSchool, Skyward, Google Sheets...) as a CSV. One file can hold all your classes: a Course or Period column splits them up. You only need to do this once. Classes you already have (for example from Google Classroom) get the student IDs added to the students already there.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <RosterFileHelp />
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} />
          <Button variant="ghost" onClick={() => fileRef.current?.click()} className={cn(actionButton, "w-full border-dashed py-6")}>
            <FileUp className="mr-2 h-5 w-5" />{fileName ? `Chosen: ${fileName}` : "Choose a CSV file"}
          </Button>
          <details className="text-sm text-slate-600">
            <summary className="cursor-pointer">Or paste the columns</summary>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setFileName("") }}
              rows={6}
              placeholder={"Student ID,Last Name,First Name,Course,Period\n1001,Miller,Sean,AP Statistics,2"}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-blue-400"
              aria-label="Class list columns"
            />
          </details>

          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

          {preview && (
            preview.classes.length === 0 ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No student names found. The file needs a name column (Name, or First and Last).</p>
            ) : (
              <div className="rounded-xl border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                  Found {preview.classes.length} class{preview.classes.length === 1 ? "" : "es"}, {total} student{total === 1 ? "" : "s"}
                </p>
                <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto text-sm">
                  {preview.classes.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900">{c.name}{c.period ? <span className="font-normal text-slate-500"> · Period {c.period}</span> : null}</span>
                        <span className="block truncate text-xs text-slate-500">{c.students.slice(0, 4).map((s) => `${s.firstName} ${s.lastName}`.trim()).join(", ")}{c.students.length > 4 ? ", …" : ""}</span>
                      </span>
                      <span className="shrink-0 text-slate-500">{c.students.length} student{c.students.length === 1 ? "" : "s"}{c.students.some((s) => s.studentNumber) ? " · IDs" : ""}{c.students.some((s) => s.email) ? " · emails" : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className={actionButton}>Cancel</Button>
            <Button onClick={doImport} disabled={busy || !preview?.classes.length} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : `Import ${preview?.classes.length ?? 0} class${preview?.classes.length === 1 ? "" : "es"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

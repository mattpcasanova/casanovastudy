"use client"

// "Send to gradebook" on class results: pick your school's gradebook and get
// the file it imports (or scores to paste), with that gradebook's steps.
// Google Classroom syncs directly (see GoogleClassroomSync). Choice is
// remembered per browser.

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EXPORT_PRESETS, PRESET_ORDER, buildExport, toCsv, toTsv, type ExportPreset, type ExportRow } from "@/lib/grading/exports"
import { toXlsx } from "@/lib/grading/xlsx"

const PREF = "cs:pref:gradebook"

export function GradebookExportDialog({ open, onOpenChange, title, rows, classroomSync }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  rows: ExportRow[]
  /** Shown first when the class came from Google Classroom. */
  classroomSync?: React.ReactNode
}) {
  const [preset, setPreset] = useState<ExportPreset>("focus")
  const [missingAsZero, setMissingAsZero] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(PREF) as ExportPreset | null
    if (saved && saved in EXPORT_PRESETS) setPreset(saved)
  }, [])

  const info = EXPORT_PRESETS[preset]
  const out = useMemo(() => buildExport(rows, preset, { title, missingAsZero }), [rows, preset, title, missingAsZero])
  const hasMissing = rows.some((r) => r.marks == null && r.status === "missing")

  const pick = (p: ExportPreset) => {
    setPreset(p)
    setCopied(false)
    localStorage.setItem(PREF, p)
  }

  const download = async () => {
    const base = `${title} - ${info.label}`.replace(/[\\/:*?"<>|]+/g, " ").trim()
    const blob = info.file === "xlsx"
      ? new Blob([(await toXlsx(out.table)) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      : new Blob([toCsv(out.table, { quote: preset !== "eschool" })], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${base}.${info.file === "xlsx" ? "xlsx" : "csv"}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copy = async () => {
    // Just the score column for pasting (Infinite Campus); the full table is shown below.
    await navigator.clipboard.writeText(toTsv(out.table.slice(1).map((r) => [r[r.length - 1]])))
    setCopied(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send scores to your gradebook</DialogTitle>
          <DialogDescription>Pick your school&apos;s gradebook. You&apos;ll get the file it imports, matched on student ID, with the steps to bring it in.</DialogDescription>
        </DialogHeader>

        {classroomSync}

        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Gradebook</span>
            <select value={preset} onChange={(e) => pick(e.target.value as ExportPreset)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              {PRESET_ORDER.map((p) => <option key={p} value={p}>{EXPORT_PRESETS[p].label}</option>)}
            </select>
          </label>

          <ol className="list-decimal space-y-1 rounded-xl bg-slate-50 p-4 pl-8 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
            {info.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>

          {hasMissing && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={missingAsZero} onChange={(e) => setMissingAsZero(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Give students marked Missing a 0
            </label>
          )}

          {out.unmatched.length > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {out.unmatched.length} student{out.unmatched.length === 1 ? " has" : "s have"} no {info.needs === "email" ? "email" : "student ID"} on the class roster, so the gradebook can&apos;t match {out.unmatched.length === 1 ? "them" : "them"}: {out.unmatched.slice(0, 6).join(", ")}{out.unmatched.length > 6 ? "…" : ""}. Add IDs by importing your roster with a Student ID column.
            </p>
          )}
          <p className="text-xs text-slate-500">
            {out.table.length - (info.file === "copy" || preset === "powerschool" || preset === "eschool" ? 0 : 1)} score{out.table.length === 2 ? "" : "s"}{out.skipped ? `; ${out.skipped} student${out.skipped === 1 ? "" : "s"} with no paper left out (mark them in the gradebook)` : ""}.
          </p>

          <div className="max-h-48 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {out.table.slice(0, 40).map((row, i) => (
                  <tr key={i} className={i === 0 && info.file !== "copy" && preset !== "powerschool" && preset !== "eschool" ? "bg-slate-50 font-semibold" : ""}>
                    {row.map((v, j) => <td key={j} className="whitespace-nowrap px-2 py-1">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            {info.file === "copy" ? (
              <Button onClick={copy} className="bg-blue-600 hover:bg-blue-700">{copied ? <><Check className="mr-2 h-4 w-4" />Copied</> : <><Copy className="mr-2 h-4 w-4" />Copy scores</>}</Button>
            ) : (
              <Button onClick={() => void download()} className="bg-blue-600 hover:bg-blue-700"><Download className="mr-2 h-4 w-4" />Download {info.file === "xlsx" ? "Excel file" : "CSV"}</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

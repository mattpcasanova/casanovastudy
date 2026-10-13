"use client"

// One class (light version, 2026-10-13): the roster of names grading matches
// against, the join code, this class's graded sets, and its top weak spots.
// Deliberately nothing else (no assignments, calendar or gradebook).

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ClipboardPaste, Copy, Link2, Loader2, Pencil, QrCode, RefreshCw, Trash2, Unlink, UserPlus } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import ClassFormDialog from "@/components/teacher-classes/class-form-dialog"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import type { RosterRow } from "@/lib/classes/server"
import type { ClassWeakSpot } from "@/lib/classes/weak-spots"
import type { ClassArea } from "@/lib/classes/areas"
import { ClassAreas } from "@/components/classes/class-areas"
import { StampTestDialog } from "@/components/classes/stamp-test-dialog"

interface ClassInfo { id: string; name: string; period: string | null; subject: string | null; enrollment_code: string }
interface BatchSummary { id: string; title: string | null; createdAt: string; papers: number; average: number; released: boolean }

export default function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <ClassView id={id} />
    </AuthGate>
  )
}

function ClassView({ id }: { id: string }) {
  const [cls, setCls] = useState<ClassInfo | null>(null)
  const [roster, setRoster] = useState<RosterRow[] | null>(null)
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [weakSpots, setWeakSpots] = useState<ClassWeakSpot[]>([])
  const [linkedStudents, setLinkedStudents] = useState(0)
  const [areas, setAreas] = useState<ClassArea[]>([])
  const [setsWithoutReport, setSetsWithoutReport] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [paste, setPaste] = useState("")
  const [pasteOpen, setPasteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [editOpen, setEditOpen] = useState(false)
  const [stampOpen, setStampOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const [rosterRes, summaryRes] = await Promise.all([
      authFetch(`/api/classes/${id}/roster`, { cache: "no-store" }),
      authFetch(`/api/classes/${id}/summary`, { cache: "no-store" }),
    ])
    const rosterData = await rosterRes.json().catch(() => ({}))
    if (!rosterRes.ok) { setError(rosterData.error || "Could not load this class"); return }
    setCls(rosterData.class)
    setRoster(rosterData.roster)
    if (rosterData.roster.length === 0) setPasteOpen(true)
    const summary = await summaryRes.json().catch(() => ({}))
    if (summaryRes.ok) {
      setBatches(summary.batches ?? [])
      setWeakSpots(summary.weakSpots ?? [])
      setLinkedStudents(summary.linkedStudents ?? 0)
      setAreas(summary.areas ?? [])
      setSetsWithoutReport(summary.setsWithoutReport ?? 0)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const addNames = async () => {
    if (!paste.trim()) return
    setBusy(true)
    try {
      const res = await authFetch(`/api/classes/${id}/roster`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: paste }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not add those names")
      setRoster(data.roster)
      setPaste("")
      setPasteOpen(false)
      setNotice(`Added ${data.added} name${data.added === 1 ? "" : "s"}${data.skipped ? `, ${data.skipped} already on the list` : ""}.`)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not add those names")
    } finally {
      setBusy(false)
    }
  }

  const patchRow = async (row: RosterRow, body: Record<string, unknown>) => {
    const res = await authFetch(`/api/classes/${id}/roster/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setNotice(data.error || "Could not save"); return false }
    return true
  }

  const removeRow = async (row: RosterRow) => {
    setRoster((r) => r?.filter((x) => x.id !== row.id) ?? null)
    await authFetch(`/api/classes/${id}/roster/${row.id}`, { method: "DELETE" })
  }

  const joinUrl = cls && typeof window !== "undefined" ? `${window.location.origin}/classes/join?code=${cls.enrollment_code}` : ""

  const copyLink = async () => {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const newCode = async () => {
    const res = await fetch(`/api/classes/${id}/regenerate-code`, { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.class?.enrollment_code) setCls((c) => (c ? { ...c, enrollment_code: data.class.enrollment_code } : c))
    else if (res.ok && data.enrollment_code) setCls((c) => (c ? { ...c, enrollment_code: data.enrollment_code } : c))
    else setNotice(data.error || "Could not make a new code")
  }

  if (error) return <Shell><p className="rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p></Shell>
  if (!cls || !roster) return <Shell><p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p></Shell>

  return (
    <Shell>
      <Link href="/teacher/classes" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"><ArrowLeft className="h-4 w-4" />My classes</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{cls.name}</h1>
          <p className="text-slate-600">{[cls.period && `Period ${cls.period}`, cls.subject, `${roster.length} name${roster.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => setStampOpen(true)} disabled={!roster.length} title={roster.length ? undefined : "Add names first"}><QrCode className="mr-2 h-4 w-4" />Print stamped copies</Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700"><Link href={`/grade-exam/batch?class=${cls.id}`}>Grade this class</Link></Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Roster */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Roster</h2>
            {!pasteOpen && <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />Add names</Button>}
          </div>

          {pasteOpen && (
            <div className="mb-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <p className="mb-2 text-sm text-slate-700">Paste your class list, one student per line, or choose a CSV from your gradebook. &quot;Last, First&quot;, student IDs and columns copied from a spreadsheet all work.</p>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={8}
                placeholder={"Sean Miller\nLee, Mary Ann\nAva Kim"}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                aria-label="Class list"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Choose a CSV
                  <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPaste(await f.text()) }} />
                </label>
                <Button onClick={addNames} disabled={busy || !paste.trim()} className="bg-blue-600 hover:bg-blue-700"><ClipboardPaste className="mr-2 h-4 w-4" />{busy ? "Adding…" : "Add to roster"}</Button>
                {roster.length > 0 && <Button variant="ghost" onClick={() => setPasteOpen(false)}>Cancel</Button>}
              </div>
            </div>
          )}

          {notice && <p className="mb-3 text-sm text-slate-600" aria-live="polite">{notice}</p>}

          {roster.length === 0 ? (
            <p className="text-sm text-slate-500">No names yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {roster.map((row) => (
                <RosterItem
                  key={row.id}
                  row={row}
                  onRename={async (firstName, lastName) => {
                    if (await patchRow(row, { firstName, lastName })) setRoster((r) => r?.map((x) => (x.id === row.id ? { ...x, firstName, lastName } : x)) ?? null)
                  }}
                  onUnlink={async () => {
                    if (await patchRow(row, { unlink: true })) setRoster((r) => r?.map((x) => (x.id === row.id ? { ...x, linked: false, studentUserId: null } : x)) ?? null)
                  }}
                  onRemove={() => void removeRow(row)}
                />
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Join code */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Join code</h2>
            <p className="mt-1 text-xs text-slate-500">Optional. Students who join are linked to their name, so you can release reports to them and see their weak spots.</p>
            <p className="my-3 text-center font-mono text-3xl font-bold tracking-[0.3em] text-slate-900">{cls.enrollment_code}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={copyLink}>{copied ? <><Check className="mr-1.5 h-4 w-4" />Copied</> : <><Copy className="mr-1.5 h-4 w-4" />Copy link</>}</Button>
              <Button variant="ghost" size="sm" onClick={newCode} title="Make a new code (the old one stops working)"><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </section>

          {/* Weak spots */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Top weak spots</h2>
            {linkedStudents === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Shows once students join with the code and study on Casanova Study.</p>
            ) : weakSpots.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">No weak spots yet across {linkedStudents} linked student{linkedStudents === 1 ? "" : "s"}.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {weakSpots.map((s) => (
                  <li key={s.key} className="text-sm">
                    <span className="font-medium text-slate-900">{s.topic}</span>
                    <span className="block text-xs text-slate-500">{s.students} student{s.students === 1 ? "" : "s"} · {Math.round(s.accuracy * 100)}% right lately</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {batches.length > 0 && <ClassAreas areas={areas} className={cls.name} setsWithoutReport={setsWithoutReport} />}

      {/* Graded work */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Graded class sets</h2>
        {batches.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">Nothing graded for this class yet. Pick this class when you grade a stack.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <Link href={`/grade-exam/batch/${b.id}`} className="font-medium text-blue-700 hover:underline">{b.title || "Untitled"}</Link>
                <span className="text-slate-500">{new Date(b.createdAt).toLocaleDateString()} · {b.papers} paper{b.papers === 1 ? "" : "s"} · average {b.average.toFixed(1)}%</span>
                {b.released && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Released</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <StampTestDialog open={stampOpen} onOpenChange={setStampOpen} defaultClassId={cls.id} />
      <ClassFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        classId={cls.id}
        initialValues={{ name: cls.name, period: cls.period, subject: cls.subject }}
        onSaved={(c) => setCls((prev) => (prev ? { ...prev, name: c.name, period: c.period, subject: c.subject } : prev))}
      />
    </Shell>
  )
}

function RosterItem({ row, onRename, onUnlink, onRemove }: { row: RosterRow; onRename: (first: string, last: string) => void; onUnlink: () => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  const [first, setFirst] = useState(row.firstName)
  const [last, setLast] = useState(row.lastName)
  const [confirm, setConfirm] = useState(false)

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 py-2">
        <input value={first} onChange={(e) => setFirst(e.target.value)} className="w-36 rounded-md border px-2 py-1 text-sm" aria-label="First name" autoFocus />
        <input value={last} onChange={(e) => setLast(e.target.value)} className="w-40 rounded-md border px-2 py-1 text-sm" aria-label="Last name" />
        <Button size="sm" onClick={() => { onRename(first.trim(), last.trim()); setEditing(false) }}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => { setFirst(row.firstName); setLast(row.lastName); setEditing(false) }}>Cancel</Button>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-2 py-2">
      <span className="flex-1 text-sm text-slate-900">
        {row.lastName ? <><span className="font-medium">{row.lastName}</span>, {row.firstName}</> : <span className="font-medium">{row.firstName}</span>}
        {row.studentNumber && <span className="ml-2 text-xs text-slate-400">#{row.studentNumber}</span>}
      </span>
      {row.linked && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><Link2 className="h-3 w-3" />Joined</span>}
      {confirm ? (
        <span className="flex items-center gap-1 text-xs">
          <button type="button" onClick={onRemove} className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700">Remove</button>
          <button type="button" onClick={() => setConfirm(false)} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100">Keep</button>
        </span>
      ) : (
        <span className="flex items-center opacity-60 group-hover:opacity-100">
          <button type="button" onClick={() => setEditing(true)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Rename ${row.firstName}`}><Pencil className="h-3.5 w-3.5" /></button>
          {row.linked && <button type="button" onClick={onUnlink} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Unlink account" title="Unlink this student's account"><Unlink className="h-3.5 w-3.5" /></button>}
          <button type="button" onClick={() => setConfirm(true)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${row.firstName}`}><Trash2 className="h-3.5 w-3.5" /></button>
        </span>
      )}
    </li>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  )
}

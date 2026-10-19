"use client"

// "Students turned it in on Google Classroom": pick the course and assignment,
// see who uploaded what, then pick the files in Google's file picker (which
// gives this app access to just those files) and they download into the stack,
// each tagged with the student who uploaded it. Hidden until Google is set up.

import { useEffect, useRef, useState } from "react"
import { GraduationCap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { selectBox } from "@/components/grading/grading-ui"
import { cn } from "@/lib/utils"
import { authFetch } from "@/lib/auth-fetch"
import { connectGoogleClassroom } from "@/components/classes/google-classroom-dialog"
import { DriveAccessError, downloadDriveFile, pickFiles, pickerConfigured } from "@/lib/google/picker"
import type { StudentWork } from "@/lib/google/classroom"
import { nameScore } from "@/lib/grading/names"

interface Course { id: string; name: string; section: string | null; importedClassId: string | null }
interface Assignment { id: string; title: string; due: string | null; folderId: string | null }

export interface ClassroomFiles {
  files: File[]
  /** The student each file belongs to ("First Last"). */
  owners: Map<File, string>
  classId: string | null
  title: string
  courseId: string
  workId: string
}

const selectClass = cn(selectBox, "min-w-0 flex-1")

/**
 * `initial`: the assignment this class set came from (adding papers later);
 * `alreadyGraded`: names graded in the set, left out of the files to get.
 */
export function ClassroomWorkPanel({ onFiles, disabled, initial, alreadyGraded = [], addingTo, onUseEarlier }: {
  onFiles: (picked: ClassroomFiles) => void
  disabled?: boolean
  initial?: { courseId: string; workId: string } | null
  alreadyGraded?: string[]
  /** Title of the class set these papers are being added to, if any. */
  addingTo?: string | null
  /** Switch to adding to an earlier set from this assignment (students graded there are skipped). */
  onUseEarlier?: (batchId: string, source: { courseId: string; workId: string }) => Promise<boolean>
}) {
  const [state, setState] = useState<"loading" | "hidden" | "disconnected" | "connected">("loading")
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [course, setCourse] = useState("")
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [work, setWork] = useState("")
  const [students, setStudents] = useState<StudentWork[] | null>(null)
  const [token, setToken] = useState("")
  const [classId, setClassId] = useState<string | null>(null)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [reconnect, setReconnect] = useState(false)
  const [notice, setNotice] = useState("")
  // An earlier class set from this assignment (graded some of it before).
  const [earlier, setEarlier] = useState<{ batchId: string; title: string | null; date: string; names: string[] } | null>(null)

  const fail = (data: { error?: string; reconnect?: boolean }, fallback: string) => {
    setError(data.error || fallback)
    setReconnect(!!data.reconnect)
  }

  useEffect(() => {
    if (!pickerConfigured()) { setState("hidden"); return }
    const back = new URLSearchParams(window.location.search).get("google")
    if (back === "denied") setError("Google Classroom wasn't connected (access was declined).")
    else if (back === "error" || back === "scopes") { setError("Connecting Google Classroom didn't finish. Try again and leave every box ticked."); setReconnect(true) }
    void (async () => {
      const res = await authFetch("/api/google/classroom", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.configured) { setState("hidden"); return }
      setState(data.connected ? "connected" : "disconnected")
    })()
  }, [])

  useEffect(() => {
    if (state !== "connected") return
    void (async () => {
      const res = await authFetch("/api/google/classroom/courses", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { fail(data, "Could not load your courses"); return }
      setCourses(data.courses)
    })()
  }, [state])
  // Adding to a class set that came from Classroom: open the same assignment.
  const openedInitial = useRef(false)
  useEffect(() => {
    if (!initial || !courses || openedInitial.current || !courses.some((c) => c.id === initial.courseId)) return
    openedInitial.current = true
    void (async () => {
      await pickCourse(initial.courseId)
      await pickWork(initial.workId, initial.courseId)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, initial])

  const pickCourse = async (id: string) => {
    setCourse(id); setWork(""); setStudents(null); setAssignments(null); setError(""); setNotice("")
    if (!id) return
    const res = await authFetch(`/api/google/classroom/assignments?course=${encodeURIComponent(id)}`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { fail(data, "Could not load the assignments"); return }
    setAssignments(data.assignments)
  }

  const pickWork = async (id: string, courseId = course) => {
    setWork(id); setStudents(null); setError(""); setNotice("")
    if (!id) return
    setBusy("Checking who turned it in…")
    try {
      const res = await authFetch(`/api/google/classroom/submissions?course=${encodeURIComponent(courseId)}&work=${encodeURIComponent(id)}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { fail(data, "Could not load the submissions"); return }
      setStudents(data.students)
      setToken(data.accessToken)
      setClassId(data.classId)
      setEarlier(null)
      if (!addingTo && onUseEarlier) {
        const title = assignments?.find((x) => x.id === id)?.title ?? ""
        const e = await authFetch(`/api/grade-batch/earlier?work=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}`, { cache: "no-store" })
        const found = e.ok ? (await e.json()).set : null
        if (found && (data.students as StudentWork[]).some((st) => found.names.some((n: string) => nameScore(`${st.firstName} ${st.lastName}`, n) >= 0.85))) setEarlier(found)
      }
    } finally {
      setBusy("")
    }
  }

  const gradedIn = (names: string[]) => (s: StudentWork) => names.some((g) => nameScore(`${s.firstName} ${s.lastName}`, g) >= 0.85)
  const isGraded = gradedIn(alreadyGraded)
  const graded = students?.filter(isGraded) ?? []
  const withFiles = students?.filter((s) => s.files.length && !isGraded(s)) ?? []
  const nothing = students?.filter((s) => !s.files.length && !isGraded(s)) ?? []
  const fileCount = withFiles.reduce((n, s) => n + s.files.length, 0)
  const assignment = assignments?.find((a) => a.id === work)
  // The earlier set's students who uploaded files here, and everyone else.
  const earlierDone = earlier ? (students ?? []).filter((s) => s.files.length && gradedIn(earlier.names)(s)) : []
  const earlierRest = earlier ? withFiles.filter((s) => !gradedIn(earlier.names)(s)) : []

  const getPhotos = async (skip: string[] = []) => {
    if (!students || !assignment) return
    setError(""); setNotice("")
    const owner = new Map<string, string>()
    for (const s of withFiles.filter((x) => !gradedIn(skip)(x))) for (const f of s.files) owner.set(f.id, `${s.firstName} ${s.lastName}`.trim())
    if (!owner.size) { setError("Everyone who uploaded files is already graded."); return }
    let picked
    try {
      picked = await pickFiles({ token, fileIds: [...owner.keys()], folderId: assignment.folderId, title: `Select all ${owner.size} files for ${assignment.title}` })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google's file picker didn't open")
      return
    }
    if (!picked) return
    const mine = picked.filter((p) => owner.has(p.id))
    if (!mine.length) { setError("None of the picked files were uploaded for this assignment. Pick the files shown in the picker."); return }

    const files: File[] = []
    const owners = new Map<File, string>()
    const counts = new Map<string, number>()
    let blocked = 0
    let failed = 0
    // Keep each student's files together, in the order they uploaded them.
    const order = new Map([...owner.keys()].map((id, i) => [id, i]))
    mine.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    for (const [i, p] of mine.entries()) {
      setBusy(`Downloading ${i + 1} of ${mine.length}…`)
      try {
        const { blob, ext } = await downloadDriveFile(token, p)
        const who = owner.get(p.id)!
        const n = (counts.get(who) ?? 0) + 1
        counts.set(who, n)
        const file = new File([blob], `${who} ${String(n).padStart(2, "0")}.${ext}`, { type: blob.type })
        files.push(file)
        owners.set(file, who)
      } catch (e) {
        if (e instanceof DriveAccessError) blocked++
        else failed++
      }
    }
    setBusy("")
    if (blocked && !files.length) {
      setError("Google didn't let us open the files. Connect again and leave the Google Drive box ticked, then pick the files.")
      setReconnect(true)
      return
    }
    const left = owner.size - mine.length
    setNotice([
      `Added ${files.length} file${files.length === 1 ? "" : "s"} from ${counts.size} student${counts.size === 1 ? "" : "s"}.`,
      left > 0 ? `${left} file${left === 1 ? " wasn't" : "s weren't"} picked; click Get the files again to add ${left === 1 ? "it" : "them"}.` : "",
      blocked + failed ? `${blocked + failed} couldn't be downloaded.` : "",
      classId ? "" : "No class here matches this course, so pick the class above to check the names against your roster.",
    ].filter(Boolean).join(" "))
    if (files.length) onFiles({ files, owners, classId, title: assignment.title, courseId: course, workId: work })
  }

  if (state === "loading" || state === "hidden") return null

  return (
    <div className="mb-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><GraduationCap className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Turned in on Google Classroom?</p>
          {state === "disconnected" ? (
            <>
              <p className="text-sm text-slate-600">Bring in the photos students uploaded to an assignment, already sorted by student.</p>
              <Button variant="outline" className="mt-2 h-10 rounded-xl px-4 font-semibold" disabled={disabled} onClick={async () => { const err = await connectGoogleClassroom("/grade-exam/batch?classroom=1"); if (err) setError(err) }}>Connect Google Classroom</Button>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                <select aria-label="Classroom course" value={course} onChange={(e) => void pickCourse(e.target.value)} disabled={disabled || !courses} className={selectClass}>
                  <option value="">{courses ? "Pick a course" : "Loading courses…"}</option>
                  {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ""}</option>)}
                </select>
                {course && (
                  <select aria-label="Assignment" value={work} onChange={(e) => void pickWork(e.target.value)} disabled={disabled || !assignments} className={selectClass}>
                    <option value="">{assignments ? (assignments.length ? "Pick the assignment" : "No assignments") : "Loading assignments…"}</option>
                    {assignments?.map((a) => <option key={a.id} value={a.id}>{a.title}{a.due ? ` (due ${new Date(`${a.due}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })})` : ""}</option>)}
                  </select>
                )}
              </div>
              {students && (
                <div className={cn("rounded-xl p-3 text-sm ring-1", earlier && !addingTo ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-200")}>
                  {earlier && !addingTo ? (
                    <>
                      <p className="font-semibold text-slate-900">{earlierDone.length} of {earlierDone.length + earlierRest.length} students are already graded <span className="font-normal text-slate-600">(&quot;{earlier.title || "a class set"}&quot;, {new Date(earlier.date).toLocaleDateString([], { month: "short", day: "numeric" })})</span></p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button type="button" disabled={disabled || !!busy || !earlierRest.length} onClick={async () => { const skip = earlier.names; if (await onUseEarlier!(earlier.batchId, { courseId: course, workId: work })) { setEarlier(null); await getPhotos(skip) } }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{busy}</> : `Grade the other ${earlierRest.length}`}
                        </button>
                        <button type="button" disabled={disabled || !!busy} onClick={() => { setEarlier(null); void getPhotos() }} className="inline-flex h-11 items-center rounded-xl bg-white px-5 font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">
                          Regrade all {earlierDone.length + earlierRest.length}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-800">
                        <span className="font-semibold">{withFiles.length} student{withFiles.length === 1 ? "" : "s"}{graded.length ? " left to grade" : " turned it in"}</span>
                        {graded.length > 0 && <span className="text-slate-500"> ({graded.length} already graded)</span>}
                        {withFiles.some((s) => s.late) && <span className="text-slate-500"> · {withFiles.filter((s) => s.late).length} late</span>}
                      </p>
                      {nothing.length > 0 && <p className="mt-1 text-slate-500">Nothing from {nothing.length}: {nothing.slice(0, 8).map((s) => `${s.firstName} ${s.lastName}`.trim()).join(", ")}{nothing.length > 8 ? "…" : ""}</p>}
                      {fileCount > 0 && (
                        <button type="button" disabled={disabled || !!busy} onClick={() => void getPhotos()} className="mt-2.5 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{busy}</> : `Get ${graded.length ? "their" : "the"} files`}
                        </button>
                      )}
                    </>
                  )}
                  <p className="mt-2 text-xs text-slate-500">In Google&apos;s picker, select all the files and press Select.</p>
                </div>
              )}
              {busy && !students && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{busy}</p>}
            </div>
          )}
        </div>
      </div>
      {notice && <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-900">{notice}</p>}
      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-800">
          {error}{reconnect && <> <button type="button" onClick={() => void connectGoogleClassroom("/grade-exam/batch?classroom=1")} className="font-semibold underline">Connect again</button></>}
        </p>
      )}
    </div>
  )
}

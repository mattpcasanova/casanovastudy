"use client"

// "Where do I get this file?" for roster imports: how to get a class list out
// of the common gradebooks. Any CSV with a name column works; these are the
// quickest routes we know of.

import { useState } from "react"
import { cn } from "@/lib/utils"

const SOURCES: Array<{ key: string; label: string; steps: string[] }> = [
  {
    key: "focus",
    label: "Focus",
    steps: [
      "Open Take Attendance for the class (or your gradebook's student list).",
      "Use the export button to download it as a CSV (Excel works too: save it as CSV).",
      "Drop it here. We find the Student, Student ID and Course columns and skip the attendance columns.",
      "One file per class period.",
    ],
  },
  {
    key: "classroom",
    label: "Google Classroom",
    steps: [
      "Open the class and go to the Grades tab.",
      "Click the gear (Settings) at the top right, then Download all grades as CSV.",
      "Drop it here. It has each student's name and school email, so students who sign in with Google are linked automatically.",
    ],
  },
  {
    key: "powerschool",
    label: "PowerSchool",
    steps: [
      "In PowerTeacher Pro, open the class roster (Students).",
      "Export or print it to CSV/Excel, or select the name and student number columns and copy them.",
      "Drop the file here, or paste the copied columns into the box.",
    ],
  },
  {
    key: "skyward",
    label: "Skyward",
    steps: [
      "Open the class's student list in your gradebook.",
      "Export it to Excel/CSV (or copy the name and Other ID columns).",
      "Drop the file here, or paste the copied columns.",
    ],
  },
  {
    key: "other",
    label: "Anything else",
    steps: [
      "Any spreadsheet works: copy the column with student names (and student IDs, if you have them) and paste it in.",
      "\"Last, First\", \"First Last\" and separate First/Last columns are all fine.",
      "Adding student IDs makes score files for your gradebook match up later.",
    ],
  },
]

export function RosterFileHelp({ className }: { className?: string }) {
  const [source, setSource] = useState("focus")
  const current = SOURCES.find((s) => s.key === source)!
  return (
    <details className={cn("rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200", className)}>
      <summary className="cursor-pointer font-medium text-slate-800">Where do I get this file?</summary>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SOURCES.map((s) => (
          <button key={s.key} type="button" onClick={() => setSource(s.key)} className={cn("rounded-full px-3 py-1 text-xs font-medium", s.key === source ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100")}>
            {s.label}
          </button>
        ))}
      </div>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
        {current.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
    </details>
  )
}

/**
 * Shown under an import preview when some names have no school email and no
 * student ID: those students can only be matched by picking their own name
 * on a share link, which is where wrong-name mix-ups happen.
 */
export function NoEmailNote({ students, className }: { students: Array<{ email?: string | null; studentNumber?: string | null }>; className?: string }) {
  const bare = students.filter((s) => !s.email && !s.studentNumber).length
  if (!bare) return null
  return (
    <p className={cn("rounded-lg bg-amber-50 p-3 text-sm text-amber-900", className)}>
      {bare === students.length ? "This list has no school emails or student IDs" : `${bare} of ${students.length} students have no school email or student ID`}, so those students will have to pick their own name when they open your links. Add a school email column (Google Classroom&apos;s grade download has one) and they&apos;re matched to their account automatically.
    </p>
  )
}

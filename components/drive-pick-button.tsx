"use client"

// "Pick from Google Drive" in the guide maker: the student picks files
// (Classroom materials are shared with them in Drive) and they download
// straight into the browser, then go through the normal upload preparation.
// School accounts under 18 are blocked by Google until the school's admin
// allows the app, so a failed sign-in shows a warning with the
// download-and-upload fallback instead of an error.

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, X } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { DriveAuthError, driveConfigured, driveToken, loadIdentity } from "@/lib/google/drive-auth"
import { DriveAccessError, downloadDriveFile, pickStudyFiles, preloadPicker } from "@/lib/google/picker"

const MAX_PICK = 10

function GoogleDriveMark() {
  return (
    <svg viewBox="0 0 87.3 78" aria-hidden="true" className="h-5 w-5">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}

export function DrivePickButton({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [warning, setWarning] = useState<"blocked" | "file" | "failed" | null>(null)

  // Load Google's scripts ahead of the click, so the sign-in popup opens straight from it.
  useEffect(() => {
    if (!user || !driveConfigured()) return
    void loadIdentity().then(() => setReady(true)).catch(() => {})
    preloadPicker()
  }, [user])

  if (!user || !driveConfigured()) return null

  const pick = async () => {
    setWarning(null)
    let token: string
    try {
      token = await driveToken(user.email)
    } catch (e) {
      setWarning(e instanceof DriveAuthError && e.reason !== "failed" ? "blocked" : "failed")
      return
    }
    try {
      const picked = await pickStudyFiles({ token, max: MAX_PICK })
      if (!picked?.length) return
      const files: File[] = []
      let refused = 0
      for (let i = 0; i < picked.length; i++) {
        setBusy(picked.length === 1 ? "Getting your file…" : `Getting file ${i + 1} of ${picked.length}…`)
        try {
          const { blob, ext } = await downloadDriveFile(token, picked[i])
          const name = picked[i].name.toLowerCase().endsWith(`.${ext}`) ? picked[i].name : `${picked[i].name}.${ext}`
          files.push(new File([blob], name, { type: blob.type }))
        } catch (e) {
          if (e instanceof DriveAccessError) refused++
          else throw e
        }
      }
      if (refused) setWarning("file")
      if (files.length) onFiles(files)
    } catch {
      setWarning("failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void pick()}
        disabled={disabled || !ready || !!busy}
        className="flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
          {busy || !ready ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <GoogleDriveMark />}
        </span>
        <span className="min-w-0 flex-1 truncate">{busy ?? "Pick from Google Drive"}</span>
        {!busy && <span className="shrink-0 text-xs font-medium text-slate-500">Classroom files too</span>}
      </button>
      {warning && (
        <div role="alert" className="mt-2 flex items-start gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1">
            {warning === "blocked" ? (
              <><strong>Google Drive didn&apos;t connect.</strong> If Google said access is blocked or needs your admin, your school hasn&apos;t approved Casanova Study yet. Until then, download the file from Google Classroom and upload it above.</>
            ) : warning === "file" ? (
              <><strong>Some files couldn&apos;t be opened.</strong> Download them from Google Drive or Classroom and upload them above.</>
            ) : (
              <><strong>Something went wrong with Google Drive.</strong> Try again, or download the file and upload it above.</>
            )}
          </span>
          <button type="button" onClick={() => setWarning(null)} aria-label="Dismiss" className="rounded-md p-1 text-amber-700 hover:bg-amber-100"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  )
}

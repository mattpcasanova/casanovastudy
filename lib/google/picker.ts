"use client"

// Google's file picker and Drive downloads, in the browser. Picking files in
// the picker is what gives this app (drive.file scope) access to them; the
// photos then download straight from Drive (too big to pass through our
// server). Needs NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_APP_ID
// (the Google Cloud project number of the OAuth client).

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { gapi?: any; google?: any }
}

export const pickerConfigured = () => !!(process.env.NEXT_PUBLIC_GOOGLE_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_APP_ID)

let loading: Promise<void> | null = null
function loadPicker(): Promise<void> {
  if (window.google?.picker) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://apis.google.com/js/api.js"
    script.async = true
    script.onload = () => window.gapi.load("picker", { callback: () => resolve(), onerror: () => reject(new Error("Google's file picker didn't load")) })
    script.onerror = () => { loading = null; reject(new Error("Google's file picker didn't load. Check your connection and try again.")) }
    document.head.appendChild(script)
  })
  return loading
}

export interface PickedFile { id: string; name: string; mimeType: string }

/**
 * Opens the picker showing just these files (or the assignment's folder when
 * the picker can't filter by id). Resolves with what the teacher picked, or
 * null if they closed it.
 */
export async function pickFiles(opts: { token: string; fileIds: string[]; folderId?: string | null; title: string }): Promise<PickedFile[] | null> {
  await loadPicker()
  const picker = window.google.picker
  const view = new picker.DocsView(picker.ViewId.DOCS).setMode(picker.DocsViewMode.GRID).setIncludeFolders(false)
  if (typeof view.setFileIds === "function") view.setFileIds(opts.fileIds.join(","))
  else if (opts.folderId) view.setParent(opts.folderId)
  return new Promise((resolve) => {
    const built = new picker.PickerBuilder()
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setMaxItems(Math.max(1, opts.fileIds.length))
      .setOAuthToken(opts.token)
      .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
      .setAppId(process.env.NEXT_PUBLIC_GOOGLE_APP_ID)
      .setTitle(opts.title)
      .addView(view)
      .setCallback((data: any) => {
        const action = data[picker.Response.ACTION]
        if (action === picker.Action.PICKED) {
          resolve((data[picker.Response.DOCUMENTS] ?? []).map((d: any) => ({ id: d[picker.Document.ID], name: d[picker.Document.NAME] ?? "file", mimeType: d[picker.Document.MIME_TYPE] ?? "" })))
        } else if (action === picker.Action.CANCEL) resolve(null)
      })
      .build()
    built.setVisible(true)
  })
}

const EXPORTS: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": { mime: "application/pdf", ext: "pdf" },
  "application/vnd.google-apps.presentation": { mime: "application/pdf", ext: "pdf" },
  "application/vnd.google-apps.drawing": { mime: "application/pdf", ext: "pdf" },
  "application/vnd.google-apps.spreadsheet": { mime: "application/pdf", ext: "pdf" },
}

export class DriveAccessError extends Error {}

/** Downloads a picked file (Google Docs/Slides come back as PDFs). */
export async function downloadDriveFile(token: string, file: PickedFile): Promise<{ blob: Blob; ext: string }> {
  const exported = EXPORTS[file.mimeType]
  const url = exported
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(exported.mime)}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401 || res.status === 403 || res.status === 404) throw new DriveAccessError(String(res.status))
  if (!res.ok) throw new Error(`Drive ${res.status}`)
  const blob = await res.blob()
  const ext = exported?.ext ?? (file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? extFromMime(file.mimeType || blob.type))
  return { blob, ext: ext.toLowerCase() }
}

function extFromMime(mime: string): string {
  if (mime.includes("pdf")) return "pdf"
  if (mime.includes("heic") || mime.includes("heif")) return "heic"
  if (mime.includes("png")) return "png"
  if (mime.includes("wordprocessingml")) return "docx"
  return "jpg"
}

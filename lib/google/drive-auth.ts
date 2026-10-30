"use client"

// A short-lived Google Drive token in the browser, for "Pick from Google
// Drive" in the guide maker. Only the drive.file scope: the app can open the
// files picked in Google's picker and nothing else in the Drive. Uses Google
// Identity Services (popup); nothing is stored on our server.
//
// School accounts under 18 are blocked by Google until the school's Workspace
// admin allows the app; the caller shows a warning when the popup comes back
// without a token. Needs the site's origins under "Authorized JavaScript
// origins" on the OAuth client.

/* eslint-disable @typescript-eslint/no-explicit-any */

const SCOPE = "https://www.googleapis.com/auth/drive.file"
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export const driveConfigured = () => !!(CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_APP_ID)

/** Why there's no token: the student closed the popup or Google refused (blocked by the school, denied). */
export class DriveAuthError extends Error {
  constructor(public reason: "closed" | "denied" | "failed", message: string) { super(message) }
}

let loading: Promise<void> | null = null
export function loadIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { loading = null; reject(new DriveAuthError("failed", "Google sign-in didn't load. Check your connection and try again.")) }
    document.head.appendChild(script)
  })
  return loading
}

let cached: { token: string; expires: number } | null = null

/**
 * Must be called straight from a click (the popup is opened synchronously).
 * Call loadIdentity() earlier (on mount) so the script is ready by then.
 */
export function driveToken(hint?: string): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return Promise.resolve(cached.token)
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) return Promise.reject(new DriveAuthError("failed", "Google sign-in is still loading. Try again in a moment."))
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      hint,
      callback: (res: any) => {
        if (res?.error || !res?.access_token) return reject(new DriveAuthError("denied", res?.error_description || res?.error || "No access"))
        if (!oauth2.hasGrantedAllScopes(res, SCOPE)) return reject(new DriveAuthError("denied", "Drive access wasn't allowed"))
        cached = { token: res.access_token, expires: Date.now() + Number(res.expires_in ?? 3600) * 1000 }
        resolve(res.access_token)
      },
      error_callback: (err: any) => reject(new DriveAuthError(err?.type === "popup_closed" ? "closed" : "failed", err?.message || err?.type || "Google sign-in failed")),
    })
    client.requestAccessToken({ prompt: "" })
  })
}

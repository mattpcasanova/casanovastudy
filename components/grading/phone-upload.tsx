"use client"

// Send from your phone (laptop side): for teachers without a scanner. A QR code
// opens /phone/<token> on their phone, where they take or pick photos of the
// pages; each send lands in the scanner inbox and this component adds it to the
// stack within a few seconds. Grading stays on the laptop.

import { useCallback, useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Check, CheckCircle2, Copy, Loader2, QrCode, Smartphone } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"

interface Link { sessionId: string; url: string; expiresAt: string }

export function PhoneUploadButton({ onFiles, disabled, label = "the pages" }: { onFiles: (files: File[]) => void; disabled?: boolean; label?: string }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<Link | null>(null)
  const [qr, setQr] = useState("")
  const [opened, setOpened] = useState(false)
  const [pages, setPages] = useState(0)
  const [busy, setBusy] = useState<"link" | "adding" | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const handled = useRef(new Set<string>())
  const onFilesRef = useRef(onFiles)
  onFilesRef.current = onFiles

  const live = link && new Date(link.expiresAt).getTime() > Date.now()

  const start = async () => {
    setOpen(true)
    if (live) return
    setBusy("link")
    setError("")
    const res = await authFetch("/api/phone-upload", { method: "POST" })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setError(data.error || "Could not make a code. Try again."); return }
    setLink(data)
    setOpened(false)
    setQr(await QRCode.toDataURL(data.url, { margin: 1, width: 480 }).catch(() => ""))
  }

  const addItem = useCallback(async (id: string) => {
    const res = await authFetch(`/api/scan-inbox/${id}`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Could not get the pages")
    const files: File[] = []
    for (const f of data.files as Array<{ name: string; url: string; contentType: string }>) {
      const blob = await (await fetch(f.url)).blob()
      files.push(new File([blob], f.name, { type: f.contentType || blob.type }))
    }
    onFilesRef.current(files)
    return files.length
  }, [])

  // While the code works, check for the phone every 3 s (even with the dialog closed).
  useEffect(() => {
    if (!link) return
    let stopped = false
    const tick = async () => {
      if (stopped || document.hidden || new Date(link.expiresAt).getTime() < Date.now()) return
      const res = await authFetch(`/api/phone-upload?session=${link.sessionId}`, { cache: "no-store" })
      if (!res.ok || stopped) return
      const data = await res.json()
      setOpened(data.opened)
      for (const item of data.items as Array<{ id: string }>) {
        if (handled.current.has(item.id)) continue
        handled.current.add(item.id)
        setBusy("adding")
        try {
          const n = await addItem(item.id)
          setPages((p) => p + n)
        } catch (e) {
          handled.current.delete(item.id)
          setError(e instanceof Error ? e.message : "Could not get the pages")
        } finally {
          setBusy(null)
        }
      }
    }
    void tick()
    const t = setInterval(() => void tick(), 3000)
    return () => { stopped = true; clearInterval(t) }
  }, [link, addItem])

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Smartphone className="h-5 w-5" /></span>
        <p className="min-w-[12rem] flex-1 text-sm text-slate-600">
          <span className="block font-semibold text-slate-900">No scanner? Use your phone</span>
          {pages > 0
            ? <span className="text-emerald-800">{pages} page{pages === 1 ? "" : "s"} from your phone added. Send more any time.</span>
            : <>Take photos of {label} on your phone. They show up here to grade on this computer.</>}
        </p>
        <button type="button" onClick={() => void start()} disabled={disabled} className={live ? actionButton : actionButtonPrimary}>
          {live ? <><QrCode />Show the code</> : <><Smartphone />Send from your phone</>}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg [&>*]:min-w-0">
          <DialogHeader>
            <DialogTitle>Send pages from your phone</DialogTitle>
            <DialogDescription>Point your phone&apos;s camera at this code and tap the link that appears.</DialogDescription>
          </DialogHeader>

          {busy === "link" && <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Making your code…</p>}
          {link && qr && (
            <img src={qr} alt="QR code that opens the phone upload page" className="mx-auto h-64 w-64 rounded-xl ring-1 ring-slate-200" />
          )}

          {link && (
            <div className={cn("flex items-center gap-2 rounded-xl p-3 text-sm", pages ? "bg-emerald-50 text-emerald-900" : opened ? "bg-blue-50 text-blue-900" : "bg-slate-50 text-slate-700")} role="status">
              {busy === "adding" ? <><Loader2 className="h-4 w-4 shrink-0 animate-spin" />Adding pages to your stack…</>
                : pages ? <><CheckCircle2 className="h-4 w-4 shrink-0" />{pages} page{pages === 1 ? "" : "s"} added to your stack. Send more, or close this and keep going.</>
                : opened ? <><Smartphone className="h-4 w-4 shrink-0" />Your phone is connected. Take or choose the photos there, then tap Send.</>
                : <><Loader2 className="h-4 w-4 shrink-0 animate-spin" />Waiting for your phone…</>}
            </div>
          )}

          {link && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>On your phone, tap <span className="font-medium">Take photos</span> (or pick photos or a scanned PDF you already have).</li>
              <li>Keep each student&apos;s pages together. Names only need to be on page 1.</li>
              <li>Tap <span className="font-medium">Send</span>. The pages appear here in a few seconds.</li>
            </ol>
          )}

          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}

          {link && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-500">Camera won&apos;t scan it? Send yourself this link instead. It only works for you, for 2 hours.</p>
              <div className="flex gap-2">
                <code className="block h-10 min-w-0 flex-1 truncate rounded-xl leading-10 bg-slate-50 px-3 text-xs text-slate-700 ring-1 ring-slate-200">{link.url}</code>
                <button type="button" onClick={() => void copy()} className={actionButton}>{copied ? <><Check />Copied</> : <><Copy />Copy</>}</button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className={actionButtonPrimary}>{pages ? "Done" : "Close"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

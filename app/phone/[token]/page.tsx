"use client"

// Send from your phone (phone side), opened from the QR code on the teacher's
// laptop. No sign-in: the link is the key. Photos and scanned PDFs are turned
// into page JPEGs here (a 30-page stack is ~10 MB instead of a too-big email),
// uploaded straight to storage with signed links, and appear on the laptop.

import { use, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AlertCircle, Camera, CheckCircle2, ChevronDown, Images, Loader2, Send, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { prepareMaterials } from "@/lib/uploads/prepare"
import { PHONE_LIMITS, orderPicked } from "@/lib/scan-inbox/phone"
import { cn } from "@/lib/utils"

interface Page { id: string; blob: Blob; url: string }

const bigButton = "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition disabled:opacity-50 [&_svg]:h-5 [&_svg]:w-5"

export default function PhoneUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [state, setState] = useState<"loading" | "ready" | "expired">("loading")
  const [firstName, setFirstName] = useState<string | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [preparing, setPreparing] = useState<{ message: string; done?: number; total?: number } | null>(null)
  // Between tapping the picker's checkmark and the files arriving, iOS copies
  // (and often converts) every photo, which can take minutes with nothing on
  // screen. We show the wait from the moment they come back to this page.
  const [picking, setPicking] = useState<"" | "open" | "waiting">("")
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null)
  const [sent, setSent] = useState<number | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [error, setError] = useState("")
  const sendNumber = useRef(0)
  const camera = useRef<HTMLInputElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const isIos = typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/phone-upload/${token}`, { cache: "no-store" })
      if (!res.ok) { setState("expired"); return }
      const data = await res.json()
      setFirstName(data.firstName)
      sendNumber.current = data.sends ?? 0
      setState("ready")
    })()
  }, [token])

  useEffect(() => {
    if (!picking) return
    const back = () => { if (document.visibilityState === "visible") setPicking((p) => (p === "open" ? "waiting" : p)) }
    window.addEventListener("focus", back)
    document.addEventListener("visibilitychange", back)
    return () => { window.removeEventListener("focus", back); document.removeEventListener("visibilitychange", back) }
  }, [picking])

  // Closing the picker without choosing fires "cancel" (newer browsers;
  // older ones get the "I didn't pick anything" button on the overlay).
  useEffect(() => {
    const inputs = [camera.current, picker.current]
    const cancel = () => setPicking("")
    inputs.forEach((el) => el?.addEventListener("cancel", cancel))
    return () => inputs.forEach((el) => el?.removeEventListener("cancel", cancel))
  }, [state])

  const openPicker = (input: HTMLInputElement | null) => {
    if (!input) return
    setPicking("open")
    input.click()
  }

  const addFiles = async (list: FileList | null) => {
    setPicking("")
    if (!list?.length) return
    setSent(null)
    setError("")
    const files = orderPicked(Array.from(list))
    const room = PHONE_LIMITS.maxFilesPerSend - pages.length
    if (room <= 0) { setError(`Send these ${pages.length} pages first, then add more.`); return }
    const photos = files.filter((f) => !/pdf/i.test(f.type) && !/\.pdf$/i.test(f.name)).length
    let photoNumber = 0
    setPreparing({ message: "Getting pages ready…" })
    try {
      const prepared = await prepareMaterials(files, {
        pdfMode: "images",
        maxImages: room,
        onProgress: (m) => {
          if (m.startsWith("Preparing ") && photos > 0) {
            photoNumber = Math.min(photoNumber + 1, photos)
            setPreparing({ message: photos > 1 ? `Getting photo ${photoNumber} of ${photos} ready…` : "Getting your photo ready…", done: photoNumber - 1, total: photos })
            return
          }
          const page = m.match(/page (\d+) of (\d+)/)
          setPreparing({ message: m.replace(/\.\.\.$/, "…"), ...(page ? { done: Number(page[1]) - 1, total: Number(page[2]) } : {}) })
        },
      })
      setProblems(prepared.problems)
      setPages((prev) => [...prev, ...prepared.images.map((img) => ({ id: crypto.randomUUID(), blob: img.blob, url: URL.createObjectURL(img.blob) }))])
    } catch {
      setError("Those files couldn't be opened. Try taking photos of the pages instead.")
    } finally {
      setPreparing(null)
    }
  }

  const remove = (id: string) => setPages((prev) => {
    const gone = prev.find((p) => p.id === id)
    if (gone) URL.revokeObjectURL(gone.url)
    return prev.filter((p) => p.id !== id)
  })

  const send = async () => {
    if (!pages.length) return
    setError("")
    const send = sendNumber.current + 1
    const total = pages.length
    setSending({ done: 0, total })
    const uploaded: Array<{ path: string; contentType: string }> = []
    try {
      for (let start = 0; start < total; start += 25) {
        const chunk = pages.slice(start, start + 25)
        const res = await fetch(`/api/phone-upload/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sign", send, start, files: chunk.map((p) => ({ contentType: "image/jpeg", size: p.blob.size })) }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.status === 410) { setState("expired"); return }
        if (!res.ok) throw new Error(data.error || "Could not send. Try again.")
        const uploads = data.uploads as Array<{ path: string; token: string }>
        let next = 0
        const worker = async () => {
          while (next < chunk.length) {
            const i = next++
            const { path, token: uploadToken } = uploads[i]
            let ok = false
            for (let attempt = 0; attempt < 3 && !ok; attempt++) {
              if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt))
              const { error: upErr } = await supabase.storage.from("scan-inbox").uploadToSignedUrl(path, uploadToken, chunk[i].blob, { contentType: "image/jpeg", upsert: true })
              ok = !upErr
            }
            if (!ok) throw new Error("Some pages didn't send. Check your connection and tap Send again.")
            uploaded.push({ path, contentType: "image/jpeg" })
            setSending((s) => s && { ...s, done: s.done + 1 })
          }
        }
        await Promise.all([worker(), worker(), worker()])
      }
      const res = await fetch(`/api/phone-upload/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "done", send, files: uploaded }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 410) { setState("expired"); return }
      if (!res.ok) throw new Error(data.error || "Could not finish sending. Try again.")
      sendNumber.current = send
      pages.forEach((p) => URL.revokeObjectURL(p.url))
      setPages([])
      setProblems([])
      setSent(data.pages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send. Try again.")
    } finally {
      setSending(null)
    }
  }

  const busy = !!preparing || !!sending || picking === "waiting"

  return (
    <div className="min-h-dvh bg-slate-50 pb-32">
      <header className="flex items-center gap-2 bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 px-4 pb-8 pt-5 text-white">
        <Image src="/images/casanova-study-icon.png" alt="" width={80} height={80} className="h-8 w-auto" />
        <span className="font-semibold">Casanova Study</span>
      </header>

      <main className="mx-auto -mt-4 max-w-md px-4">
        {state === "loading" && (
          <div className="flex items-center justify-center gap-2 rounded-3xl bg-white py-16 text-slate-500 shadow-lg ring-1 ring-slate-200"><Loader2 className="h-5 w-5 animate-spin" />Opening…</div>
        )}

        {state === "expired" && (
          <div className="rounded-3xl bg-white p-6 text-center shadow-lg ring-1 ring-slate-200">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
            <h1 className="mt-3 text-xl font-semibold text-slate-900">This code has expired</h1>
            <p className="mt-2 text-slate-600">Codes work for 2 hours. On your computer, open Grade a Class and tap <span className="font-medium">Send from your phone</span> for a new one.</p>
          </div>
        )}

        {state === "ready" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
              <h1 className="text-xl font-semibold text-slate-900">Send pages to your computer</h1>
              <p className="mt-1 text-slate-600">
                {firstName ? `${firstName}, take` : "Take"} photos of the papers. They show up on your grading page in a few seconds. You grade on the computer.
              </p>

              {sent !== null && (
                <p className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-emerald-900" role="status">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />Sent {sent} page{sent === 1 ? "" : "s"}. They&apos;re on your computer now. Add more below if you have them.
                </p>
              )}

              <div className="mt-4 space-y-2">
                <button type="button" onClick={() => openPicker(camera.current)} disabled={busy} className={cn(bigButton, "bg-blue-600 text-white shadow-sm active:bg-blue-700")}>
                  <Camera />{pages.length ? "Take another photo" : "Take photos"}
                </button>
                <button type="button" onClick={() => openPicker(picker.current)} disabled={busy} className={cn(bigButton, "bg-white text-slate-800 ring-1 ring-slate-300 active:bg-slate-50")}>
                  <Images />Choose photos or a PDF
                </button>
              </div>
              <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = "" }} />
              <input ref={picker} type="file" accept="image/*,application/pdf,.pdf,.heic,.heif" multiple className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = "" }} />

              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                <li>Keep each student&apos;s pages together, in order. Names only need to be on page 1.</li>
                <li>Lots of pages? It&apos;s quicker to take them all with your Camera app first, then choose them here.</li>
              </ul>

              <details className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {isIos ? "Already scanned them in Notes?" : "Already scanned them in an app?"}<ChevronDown className="h-4 w-4" />
                </summary>
                {isIos ? (
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>In Notes, open the note and tap the scan.</li>
                    <li>Tap Share (the square with the arrow), then <span className="font-medium">Save to Files</span>, then Save.</li>
                    <li>Come back here, tap <span className="font-medium">Choose photos or a PDF</span>, then <span className="font-medium">Choose File</span>, and pick it.</li>
                  </ol>
                ) : (
                  <p className="mt-2">Save the scan as a PDF (Google Drive&apos;s Scan button works well), then tap <span className="font-medium">Choose photos or a PDF</span> and pick it from Files or Drive.</p>
                )}
                <p className="mt-2 text-slate-500">Big scans are fine here: the pages are made smaller on your phone before they&apos;re sent.</p>
              </details>
            </section>

            {problems.map((p) => <p key={p} className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{p}</p>)}
            {error && <p className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

            {pages.length > 0 && (
              <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-3 font-semibold text-slate-900">{pages.length} page{pages.length === 1 ? "" : "s"} ready</h2>
                <ul className="grid grid-cols-3 gap-2">
                  {pages.map((p, i) => (
                    <li key={p.id} className="relative overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                      <span className="absolute bottom-1 left-1 rounded-md bg-slate-900/75 px-1.5 text-xs font-semibold text-white">{i + 1}</span>
                      {!sending && (
                        <button type="button" onClick={() => remove(p.id)} aria-label={`Remove page ${i + 1}`} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/75 text-white">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      {(picking === "waiting" || preparing) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center" role="status" aria-live="polite">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
            <p className="mt-4 text-lg font-semibold text-slate-900">
              {preparing ? preparing.message : "Getting your photos from your phone…"}
            </p>
            {preparing?.total ? (
              <div className="mx-auto mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.max(4, Math.round(((preparing.done ?? 0) / preparing.total) * 100))}%` }} />
              </div>
            ) : null}
            <p className="mt-3 text-sm text-slate-600">
              {preparing
                ? "Making each page smaller so it sends fast. Keep this page open."
                : "Your phone is handing the photos over. With lots of photos this can take a minute or two. Keep this page open."}
            </p>
            {!preparing && (
              <button type="button" onClick={() => setPicking("")} className="mt-4 text-sm font-medium text-slate-500 underline underline-offset-2">
                I didn&apos;t pick anything
              </button>
            )}
          </div>
        </div>
      )}

      {state === "ready" && pages.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-md">
            <button type="button" onClick={() => void send()} disabled={busy} className={cn(bigButton, "bg-emerald-700 text-white shadow-sm active:bg-emerald-800")}>
              {sending ? <><Loader2 className="animate-spin" />Sending {sending.done} of {sending.total}…</> : <><Send />Send {pages.length} page{pages.length === 1 ? "" : "s"} to my computer</>}
            </button>
            {sending && <p className="mt-2 text-center text-xs text-slate-500">Keep this page open until it&apos;s done.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

// Scanner inbox on the batch grader: the teacher's copier email address, how
// to set the copier up once, and scans that have arrived (checked every 15 s).
// "Add" downloads the scan straight from storage (signed link) and adds it to
// the stack like a dropped file.

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, CheckCircle2, Copy, Inbox, Loader2, Printer, Smartphone, Trash2 } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"

interface InboxItem {
  id: string
  from: string | null
  source?: 'email' | 'phone'
  subject: string | null
  receivedAt: string
  usedAt: string | null
  files: Array<{ name: string; size: number }>
  skipped: Array<{ name: string; reason: string }>
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`

function when(iso: string) {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function ScanInboxPanel({ onFiles, openItemId, disabled }: { onFiles: (files: File[]) => void; openItemId?: string | null; disabled?: boolean }) {
  const [address, setAddress] = useState<string | null>(null)
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  // The scan being downloaded into the stack, with how far along it is.
  const [adding, setAdding] = useState<{ id: string; done: number; total: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const autoOpened = useRef(false)

  const refresh = useCallback(async () => {
    const res = await authFetch("/api/scan-inbox", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json()
    setAddress(data.address)
    // Phone sends are added by the phone dialog; once used they're not news here.
    setItems((data.items as InboxItem[]).filter((i) => i.source !== "phone" || !i.usedAt))
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 15000)
    return () => clearInterval(t)
  }, [refresh])

  const addItem = useCallback(async (item: { id: string }) => {
    setAdding({ id: item.id, done: 0, total: 0 })
    setError("")
    try {
      const res = await authFetch(`/api/scan-inbox/${item.id}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not open that scan")
      const list = data.files as Array<{ name: string; url: string; contentType: string }>
      setAdding({ id: item.id, done: 0, total: list.length })
      // Straight from storage, six at a time: a 228-page phone send took ~20 s one by one.
      const files: File[] = new Array(list.length)
      let next = 0, finished = 0
      const worker = async () => {
        while (next < list.length) {
          const i = next++
          const blob = await (await fetch(list[i].url)).blob()
          files[i] = new File([blob], list[i].name, { type: list[i].contentType || blob.type })
          finished++
          setAdding({ id: item.id, done: finished, total: list.length })
        }
      }
      await Promise.all(Array.from({ length: Math.min(6, list.length) }, worker))
      onFiles(files)
      setAdded((s) => new Set(s).add(item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that scan")
    } finally {
      setAdding(null)
    }
  }, [onFiles])

  // Opened from the "scan received" email: add that scan straight away.
  useEffect(() => {
    if (!openItemId || autoOpened.current) return
    autoOpened.current = true
    void addItem({ id: openItemId })
  }, [openItemId, addItem])

  const remove = async (id: string) => {
    setItems((list) => list?.filter((i) => i.id !== id) ?? null)
    await authFetch(`/api/scan-inbox/${id}`, { method: "DELETE" })
  }

  const newAddress = async () => {
    const res = await authFetch("/api/scan-inbox", { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setAddress(data.address)
  }

  if (!address && !items?.length) return null

  const waiting = (items ?? []).filter((i) => i.files.length && !added.has(i.id))
  const pagesWord = (item: InboxItem) => (item.source === "phone" ? "page" : "file")
  const title = (item: InboxItem) => (item.source === "phone" ? `From your phone: ${item.files.length} page${item.files.length === 1 ? "" : "s"}` : item.files.map((f) => f.name).join(", ") || item.subject || "No usable files")

  return (
    <div className="mb-4 space-y-3">
      {/* Scans waiting to be added: the thing to do next, so it comes first and stands out. */}
      {items && items.length > 0 && (
        <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-inset ring-blue-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold text-blue-950">
                <Inbox className="h-5 w-5" />
                {waiting.length === 0 ? "Scans added to the stack" : waiting.length === 1 ? "A scan is waiting for you" : `${waiting.length} scans are waiting for you`}
              </p>
              <p className="text-sm text-blue-900">{waiting.length > 1 ? "Add them to the stack below, then sort into students." : waiting.length ? "Add it to the stack below, then sort into students." : "They're in the stack below."}</p>
            </div>
            {waiting.length > 1 && (
              <button
                type="button"
                disabled={disabled || !!adding}
                onClick={async () => { for (const item of waiting) await addItem(item) }}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300 sm:w-auto"
              >
                {adding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</> : `Add all ${waiting.length} to the stack`}
              </button>
            )}
          </div>
          <ul className="mt-3 space-y-2">
            {items.map((item) => {
              const size = item.files.reduce((s, f) => s + f.size, 0)
              const isAdded = added.has(item.id)
              const busy = adding?.id === item.id
              return (
                <li key={item.id} className={cn("rounded-xl bg-white p-3 ring-1", isAdded ? "ring-emerald-200" : "ring-blue-200")}>
                  <div className="flex flex-wrap items-center gap-3">
                    {item.source === "phone" ? <Smartphone className="h-5 w-5 shrink-0 text-blue-700" /> : <Inbox className="h-5 w-5 shrink-0 text-blue-700" />}
                    <span className="min-w-[11.5rem] flex-1">
                      <span className="block truncate font-semibold text-slate-900">{title(item)}</span>
                      <span className="block text-sm text-slate-600">
                        {when(item.receivedAt)} · {item.files.length} {pagesWord(item)}{item.files.length === 1 ? "" : "s"}, {mb(size)}{item.usedAt && !isAdded ? " · used before" : ""}
                        {item.skipped.length > 0 && item.files.length > 0 && ` · skipped ${item.skipped.map((s) => s.name).join(", ")}`}
                      </span>
                      {item.files.length === 0 && item.skipped.length > 0 && (
                        <span className="mt-0.5 block text-sm text-amber-800">{item.skipped.map((s) => s.reason).join(" ")}</span>
                      )}
                    </span>
                    {item.files.length > 0 && isAdded && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" />In your stack below</span>
                    )}
                    {item.files.length > 0 && !isAdded && (
                      <button
                        type="button"
                        disabled={disabled || !!adding}
                        onClick={() => void addItem(item)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300 sm:w-auto"
                      >
                        {busy
                          ? <><Loader2 className="h-4 w-4 animate-spin" />{adding.total ? `Getting ${pagesWord(item)} ${Math.min(adding.done + 1, adding.total)} of ${adding.total}…` : "Opening…"}</>
                          : `Add ${item.files.length} ${pagesWord(item)}${item.files.length === 1 ? "" : "s"} to the stack`}
                      </button>
                    )}
                    {!busy && <button type="button" onClick={() => void remove(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete this scan"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  {busy && adding.total > 0 && (
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-valuemin={0} aria-valuemax={adding.total} aria-valuenow={adding.done} aria-label="Adding to the stack">
                      <div className="h-full rounded-full bg-blue-700 transition-[width] duration-300" style={{ width: `${Math.max(3, Math.round((adding.done / adding.total) * 100))}%` }} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
        </div>
      )}

      {address && (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Printer className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Big stack? Scan it on the school copier</p>
              <p className="text-sm text-slate-600">Use the copier&apos;s Scan to Email and send it to your own grading address. It shows up here in a minute or two.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="flex h-11 items-center rounded-xl bg-white px-3.5 text-base font-medium text-slate-900 ring-1 ring-slate-300">{address}</code>
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 ring-1 ring-slate-300 hover:bg-blue-50">
                  {copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}
                </button>
              </div>
              <details className="mt-2 text-sm text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700">Set up the copier (once)</summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>On the copier, open <span className="font-medium">Scan to Email</span> (sometimes &quot;Scan &amp; Send&quot;) and save this address as a contact, e.g. &quot;My grading&quot;.</li>
                  <li>Settings: <span className="font-medium">PDF</span>, <span className="font-medium">grayscale or black &amp; white</span>, <span className="font-medium">200-300 dpi</span>, and <span className="font-medium">2-sided</span> if students wrote on both sides.</li>
                  <li>Put one class&apos;s stack in the feeder, papers in any order of students, and press Start. Several emails are fine; add each one here.</li>
                  <li>Students only need their name on page 1. Take staples out first so the feeder doesn&apos;t jam.</li>
                </ol>
                <p className="mt-2">Anyone with this address can send you scans. If it gets shared, <button type="button" onClick={() => void newAddress()} className="font-semibold text-blue-700 hover:underline">make a new address</button> (the old one stops working).</p>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

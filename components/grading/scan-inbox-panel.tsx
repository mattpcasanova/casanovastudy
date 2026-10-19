"use client"

// Scanner inbox on the batch grader: the teacher's copier email address, how
// to set the copier up once, and scans that have arrived (checked every 15 s).
// "Add" downloads the scan straight from storage (signed link) and adds it to
// the stack like a dropped file.

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy, Inbox, Loader2, Printer, Trash2 } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

interface InboxItem {
  id: string
  from: string | null
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
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const autoOpened = useRef(false)

  const refresh = useCallback(async () => {
    const res = await authFetch("/api/scan-inbox", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json()
    setAddress(data.address)
    setItems(data.items)
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 15000)
    return () => clearInterval(t)
  }, [refresh])

  const addItem = useCallback(async (item: { id: string }) => {
    setLoadingId(item.id)
    setError("")
    try {
      const res = await authFetch(`/api/scan-inbox/${item.id}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not open that scan")
      const files: File[] = []
      for (const f of data.files as Array<{ name: string; url: string; contentType: string }>) {
        const blob = await (await fetch(f.url)).blob()
        files.push(new File([blob], f.name, { type: f.contentType || blob.type }))
      }
      onFiles(files)
      setAdded((s) => new Set(s).add(item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that scan")
    } finally {
      setLoadingId(null)
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

  return (
    <div className="mb-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Printer className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Big stack? Scan it on the school copier</p>
          <p className="text-sm text-slate-600">Use the copier&apos;s Scan to Email and send it to your own grading address. It shows up here in a minute or two.</p>
          {address && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-white px-2.5 py-1.5 text-sm text-slate-900 ring-1 ring-slate-200">{address}</code>
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                {copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}
              </button>
            </div>
          )}
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

      {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}

      {items && items.filter((i) => i.files.length && !added.has(i.id)).length > 1 && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={disabled || !!loadingId}
            onClick={async () => { for (const item of items.filter((i) => i.files.length && !added.has(i.id))) await addItem(item) }}
            className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
          >
            {loadingId ? "Adding…" : `Add all ${items.filter((i) => i.files.length && !added.has(i.id)).length} to stack`}
          </button>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
          {items.map((item) => {
            const size = item.files.reduce((s, f) => s + f.size, 0)
            const isAdded = added.has(item.id)
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <Inbox className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">{item.files.map((f) => f.name).join(", ") || item.subject || "No usable files"}</span>
                  <span className="block text-xs text-slate-500">
                    {when(item.receivedAt)} · {item.files.length} file{item.files.length === 1 ? "" : "s"}, {mb(size)}{item.usedAt && !isAdded ? " · used before" : ""}
                    {item.skipped.length > 0 && item.files.length > 0 && ` · skipped ${item.skipped.map((s) => s.name).join(", ")}`}
                  </span>
                  {item.files.length === 0 && item.skipped.length > 0 && (
                    <span className="mt-0.5 block text-xs text-amber-800">{item.skipped.map((s) => s.reason).join(" ")}</span>
                  )}
                </span>
                {item.files.length > 0 && (
                  <button
                    type="button"
                    disabled={disabled || isAdded || loadingId === item.id}
                    onClick={() => void addItem(item)}
                    className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
                  >
                    {loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isAdded ? "Added" : "Add to stack"}
                  </button>
                )}
                <button type="button" onClick={() => void remove(item.id)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete this scan"><Trash2 className="h-4 w-4" /></button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

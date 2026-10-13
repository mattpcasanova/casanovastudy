"use client"

// Inside "Send to gradebook" for classes imported from Google Classroom: send
// the scores straight to Classroom (creates the assignment the first time,
// updates it after). Connecting returns here (?google=connected).

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth-fetch"

export function GoogleClassroomSync({ batchId, title }: { batchId: string; title: string }) {
  const [connected, setConnected] = useState(false)
  const [synced, setSynced] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    void (async () => {
      const [status, prior] = await Promise.all([authFetch("/api/google/classroom"), authFetch(`/api/google/classroom/grades?batchId=${batchId}`)])
      if (status.ok) setConnected((await status.json()).connected)
      if (prior.ok) setSynced((await prior.json()).synced?.at ?? null)
    })()
  }, [batchId])

  const connect = async () => {
    const res = await authFetch("/api/google/classroom/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ next: `/grade-exam/batch/${batchId}?send=1` }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.url) window.location.href = data.url
    else setError(data.error || "Could not connect to Google Classroom")
  }

  const send = async () => {
    setBusy(true)
    setError("")
    setResult("")
    try {
      const res = await authFetch("/api/google/classroom/grades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId }) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401 && data.reconnect) { setConnected(false); throw new Error(data.error) }
      if (!res.ok) throw new Error(data.error || "Could not send the scores")
      setSynced(new Date().toISOString())
      setResult(`Sent ${data.sent} score${data.sent === 1 ? "" : "s"} to "${data.assignment}" in Google Classroom.${data.notFound.length ? ` Not found in the course: ${data.notFound.slice(0, 5).join(", ")}${data.notFound.length > 5 ? "…" : ""}.` : ""} Return the work in Classroom when you're ready for students to see it.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the scores")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-2 rounded-xl bg-emerald-50 p-4 text-sm ring-1 ring-inset ring-emerald-200">
      <p className="font-semibold text-emerald-950">Google Classroom</p>
      <p className="mt-1 text-emerald-900">
        {synced
          ? <>Sent before ({new Date(synced).toLocaleString()}). Sending again updates the same assignment.</>
          : <>This creates an assignment called &quot;{title}&quot; in your Classroom course (students will see it posted) and fills in each student&apos;s score as a draft grade you return when ready.</>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {connected
          ? <Button size="sm" onClick={() => void send()} disabled={busy} className="bg-emerald-700 hover:bg-emerald-800">{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : synced ? "Update scores in Classroom" : "Send scores to Classroom"}</Button>
          : <Button size="sm" onClick={() => void connect()} className="bg-emerald-700 hover:bg-emerald-800">Connect Google Classroom</Button>}
      </div>
      {result && <p className="mt-2 text-emerald-900">{result}</p>}
      {error && <p className="mt-2 text-rose-800">{error}</p>}
    </div>
  )
}

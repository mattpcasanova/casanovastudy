"use client"

// Runs student code in the browser sandbox (lib/code-runner/sources.ts).
// One hidden iframe per page, created on first use and kept, so Python only
// loads once per visit (the Pyodide files are cached by the browser after that).

import type { RunnableLang } from '@/lib/code-exercise/format'
import { sandboxDocument } from './sources'

export interface TestResult {
  test: string
  pass: boolean
  got?: string
  expected?: string
  error?: { message: string; line: number | null }
}

export interface RunResult {
  stdout: string
  error: { message: string; line: number | null } | null
  tests: TestResult[]
  /** The sandbox stopped the run (timeout, load failure); not the student's error. */
  failed?: boolean
}

type Pending = { resolve: (r: RunResult) => void; onStatus?: (s: 'loading' | 'running') => void }

let frame: HTMLIFrameElement | null = null
let ready: Promise<void> | null = null
const pending = new Map<string, Pending>()
let seq = 0

function ensureFrame(): Promise<void> {
  if (ready && frame?.isConnected) return ready
  ready = new Promise<void>((resolve) => {
    const el = document.createElement('iframe')
    // allow-scripts only: an opaque origin with no access to the app.
    el.setAttribute('sandbox', 'allow-scripts')
    el.setAttribute('aria-hidden', 'true')
    el.setAttribute('tabindex', '-1')
    el.title = 'Code runner'
    el.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;left:-9999px;top:0'
    const onMessage = (e: MessageEvent) => {
      if (e.source !== el.contentWindow) return
      const d = e.data as { kind?: string; id?: string; status?: 'loading' | 'running'; result?: RunResult }
      if (d?.kind === 'hello') resolve()
      else if (d?.kind === 'status' && d.id) pending.get(d.id)?.onStatus?.(d.status!)
      else if (d?.kind === 'result' && d.id) {
        const p = pending.get(d.id)
        pending.delete(d.id)
        p?.resolve(d.result!)
      }
    }
    window.addEventListener('message', onMessage)
    el.srcdoc = sandboxDocument()
    document.body.appendChild(el)
    frame = el
  })
  return ready
}

/** Start loading a language early (e.g. when an exercise scrolls into view). */
export async function warmRunner(lang: RunnableLang): Promise<void> {
  await ensureFrame()
  frame?.contentWindow?.postMessage({ kind: 'warm', lang }, '*')
}

export async function runCode(
  { lang, code, tests = [], timeoutMs = 5000 }: { lang: RunnableLang; code: string; tests?: string[]; timeoutMs?: number },
  onStatus?: (s: 'loading' | 'running') => void,
): Promise<RunResult> {
  await ensureFrame()
  const id = `run-${++seq}`
  return new Promise<RunResult>((resolve) => {
    pending.set(id, { resolve, onStatus })
    frame?.contentWindow?.postMessage({ kind: 'run', id, lang, code, tests, timeoutMs }, '*')
    // Python's first load can take a while on a slow connection; give up after 90 s.
    setTimeout(() => {
      if (!pending.has(id)) return
      pending.delete(id)
      resolve({ stdout: '', error: { message: "The code runner didn't respond. Reload the page and try again.", line: null }, tests: [], failed: true })
    }, 90_000)
  })
}

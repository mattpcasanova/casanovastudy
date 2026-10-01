"use client"

import { useEffect, useSyncExternalStore, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Installable-app plumbing: registers the service worker, keeps the browser's
// deferred install prompt (Chrome/Edge/Android), and knows when to show iOS
// "Add to Home Screen" instructions instead (Safari has no install prompt).

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep it for our own button instead of the mini-infobar
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export type InstallMode = 'prompt' | 'ios' | null

/** How this device can install the app right now (null = already installed / not possible). */
export function useInstall(): { mode: InstallMode; install: () => Promise<boolean> } {
  const state = useSyncExternalStore(
    subscribe,
    () => (installed ? 'installed' : deferred ? 'prompt' : 'none'),
    () => 'none'
  )
  const [ios, setIos] = useState(false)
  const [standalone, setStandalone] = useState(true) // assume installed until mounted (no flash)
  useEffect(() => {
    setIos(isIOS())
    setStandalone(isStandalone())
  }, [])

  const mode: InstallMode = standalone || state === 'installed' ? null : state === 'prompt' ? 'prompt' : ios ? 'ios' : null

  const install = async () => {
    if (!deferred) return false
    const e = deferred
    deferred = null
    emit()
    await e.prompt()
    const { outcome } = await e.userChoice
    return outcome === 'accepted'
  }
  return { mode, install }
}

/** Registers /sw.js in production builds (dev skips it so Turbopack HMR isn't cached). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker registration failed:', err))
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}

const DISMISS_KEY = 'cs:hint:install'

/**
 * A dismissible "Add Casanova Study to your home screen" card. Phones and
 * tablets only; hidden once installed or dismissed.
 */
export function InstallAppCard({ reason }: { reason: string }) {
  const { mode, install } = useInstall()
  const [hidden, setHidden] = useState(true)
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1' } catch {}
    const touch = window.matchMedia('(pointer: coarse)').matches
    setHidden(dismissed || !touch)
  }, [])

  if (hidden || !mode) return null

  const dismiss = () => {
    setHidden(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    <div className="relative mb-4 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 pr-10 print:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">Add Casanova Study to your home screen</p>
        <p className="mt-0.5 text-sm text-slate-600">{reason}</p>
        {mode === 'prompt' && (
          <Button size="sm" className="mt-3 h-9 bg-blue-600 text-white hover:bg-blue-700" onClick={async () => { if (await install()) dismiss() }}>
            <Download className="mr-1.5 h-4 w-4" /> Install app
          </Button>
        )}
        {mode === 'ios' && !showSteps && (
          <Button size="sm" variant="outline" className="mt-3 h-9 border-blue-300 bg-white text-blue-700" onClick={() => setShowSteps(true)}>
            Show me how
          </Button>
        )}
        {mode === 'ios' && showSteps && <IosSteps />}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-blue-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function IosSteps() {
  return (
    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
      <li>In Safari, tap the <Share className="inline h-4 w-4 align-text-bottom text-blue-600" aria-label="Share" /> Share button.</li>
      <li>Scroll down and tap <span className="font-semibold">Add to Home Screen</span>.</li>
      <li>Tap <span className="font-semibold">Add</span>, then open Casanova Study from your home screen.</li>
    </ol>
  )
}

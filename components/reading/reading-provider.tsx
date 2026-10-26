"use client"

// Reading settings for guides and Learn mode: font (standard, Atkinson
// Hyperlegible, OpenDyslexic), text size, line spacing and read-aloud
// buttons. Saved per browser (cs:pref:reading) and applied as data attributes
// on the wrapper; the CSS lives in globals.css ([data-reading-*]). Read aloud
// speaks in the guide's language (GUIDE_LANGUAGES[].speech).

import { createContext, useContext, useEffect, useId, useState } from "react"
import localFont from "next/font/local"
import { Square, Type, Volume2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { GUIDE_LANGUAGES, normalizeLanguage } from "@/lib/study-options"
import { onSpeakingChange, speak, speechSupported, stopSpeaking } from "@/lib/reading/speech"
import { cn } from "@/lib/utils"

// Not preloaded: the browser only downloads a face once someone picks it.
const readableFont = localFont({
  src: [
    { path: "../../app/fonts/atkinson-hyperlegible-latin-400-normal.woff2", weight: "400" },
    { path: "../../app/fonts/atkinson-hyperlegible-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-readable",
  display: "swap",
  preload: false,
})
const dyslexicFont = localFont({
  src: [
    { path: "../../app/fonts/opendyslexic-latin-400-normal.woff2", weight: "400" },
    { path: "../../app/fonts/opendyslexic-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-dyslexic",
  display: "swap",
  preload: false,
})

export type ReadingFont = "standard" | "readable" | "dyslexic"
export type ReadingSize = "normal" | "large" | "larger"
export type ReadingSpacing = "normal" | "relaxed"

export interface ReadingSettings {
  font: ReadingFont
  size: ReadingSize
  spacing: ReadingSpacing
  readAloud: boolean
}

const DEFAULTS: ReadingSettings = { font: "standard", size: "normal", spacing: "normal", readAloud: true }
const KEY = "cs:pref:reading"

interface ReadingContextValue {
  settings: ReadingSettings
  update: (patch: Partial<ReadingSettings>) => void
  /** BCP 47 code for the voice, from the guide's language. */
  speechLang: string
}

const ReadingContext = createContext<ReadingContextValue | null>(null)

export function useReading() {
  return useContext(ReadingContext)
}

function load(): ReadingSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<ReadingSettings>
    return {
      font: ["standard", "readable", "dyslexic"].includes(saved.font as string) ? saved.font! : DEFAULTS.font,
      size: ["normal", "large", "larger"].includes(saved.size as string) ? saved.size! : DEFAULTS.size,
      spacing: saved.spacing === "relaxed" ? "relaxed" : "normal",
      readAloud: saved.readAloud !== false,
    }
  } catch {
    return DEFAULTS
  }
}

export function ReadingProvider({ language, children, className }: { language?: string | null; children: React.ReactNode; className?: string }) {
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULTS)
  useEffect(() => { setSettings(load()) }, [])
  // Leaving the page shouldn't leave a voice talking.
  useEffect(() => () => stopSpeaking(), [])

  const update = (patch: Partial<ReadingSettings>) => setSettings((prev) => {
    const next = { ...prev, ...patch }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
    if (patch.readAloud === false) stopSpeaking()
    return next
  })

  const speechLang = GUIDE_LANGUAGES.find((l) => l.value === normalizeLanguage(language))!.speech

  return (
    <ReadingContext.Provider value={{ settings, update, speechLang }}>
      <div className={cn(readableFont.variable, dyslexicFont.variable, className)}>{children}</div>
    </ReadingContext.Provider>
  )
}

/**
 * The part of the page the settings apply to (the guide itself). Kept apart
 * from the provider so fixed docks and the banner aren't zoomed.
 */
export function ReadingSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  const reading = useReading()
  if (!reading) return <div className={className}>{children}</div>
  const { settings } = reading
  return (
    <div className={className} data-reading-font={settings.font} data-reading-size={settings.size} data-reading-spacing={settings.spacing}>
      {children}
    </div>
  )
}

/** Speaker button: reads the text aloud in the guide's language; tap again to stop. */
export function ReadAloudButton({ text, label = "Read aloud", className }: { text: string; label?: string; className?: string }) {
  const reading = useReading()
  const id = useId()
  const [speaking, setSpeakingState] = useState(false)
  const [supported, setSupported] = useState(false)
  useEffect(() => setSupported(speechSupported()), [])
  useEffect(() => onSpeakingChange((now) => setSpeakingState(now === id)), [id])
  if (!reading || !reading.settings.readAloud || !supported || !text.trim()) return null

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation() // flashcards flip on click
        if (speaking) stopSpeaking()
        else speak(id, text, { lang: reading.speechLang })
      }}
      aria-label={speaking ? "Stop reading" : label}
      aria-pressed={speaking}
      title={speaking ? "Stop reading" : label}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition print:hidden",
        speaking ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-600 ring-slate-200 hover:text-blue-700 hover:ring-blue-300",
        className,
      )}
    >
      {speaking ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-5 w-5" />}
    </button>
  )
}

const FONT_OPTIONS: Array<{ value: ReadingFont; label: string; sample: string; family: string }> = [
  { value: "standard", label: "Standard", sample: "The quick brown fox", family: "var(--font-sans, inherit)" },
  { value: "readable", label: "Easy to read", sample: "The quick brown fox", family: "var(--font-readable)" },
  { value: "dyslexic", label: "OpenDyslexic", sample: "The quick brown fox", family: "var(--font-dyslexic)" },
]

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl bg-slate-100 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-10 rounded-lg text-sm font-semibold transition", value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** "Reading" button for the guide banner; opens the settings. */
export function ReadingSettingsButton({ className }: { className?: string }) {
  const reading = useReading()
  const [open, setOpen] = useState(false)
  const [supported, setSupported] = useState(true)
  useEffect(() => setSupported(speechSupported()), [])
  if (!reading) return null
  const { settings, update } = reading

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white", className)}
      >
        <Type className="h-4 w-4" />
        Reading
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("max-h-[90dvh] overflow-y-auto sm:max-w-md")}>
          <DialogHeader>
            <DialogTitle>Reading settings</DialogTitle>
            <DialogDescription>Change how guides look and sound. Saved on this device.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-800">Font</legend>
              <div className="grid gap-2" role="radiogroup" aria-label="Font">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={settings.font === f.value}
                    onClick={() => update({ font: f.value })}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition",
                      settings.font === f.value ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-300",
                    )}
                  >
                    <span className="text-sm font-semibold text-slate-900">{f.label}</span>
                    <span className={cn(readableFont.variable, dyslexicFont.variable, "text-base text-slate-600")} style={{ fontFamily: f.family }}>{f.sample}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Easy to read (Atkinson Hyperlegible) makes similar letters look different. Some readers with dyslexia prefer OpenDyslexic.</p>
            </fieldset>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Text size</p>
              <Segmented label="Text size" value={settings.size} onChange={(size) => update({ size })} options={[{ value: "normal", label: "Normal" }, { value: "large", label: "Large" }, { value: "larger", label: "Larger" }]} />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Line spacing</p>
              <Segmented label="Line spacing" value={settings.spacing} onChange={(spacing) => update({ spacing })} options={[{ value: "normal", label: "Normal" }, { value: "relaxed", label: "More space" }]} />
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Volume2 className="h-4 w-4 text-blue-600" />Read-aloud buttons</span>
                <span className="block text-xs text-slate-500">
                  {supported ? "A speaker button on each question and card reads it out loud. You can also highlight any text and pick Read aloud." : "This browser can't read text aloud."}
                </span>
              </span>
              <Switch checked={settings.readAloud} onCheckedChange={(on) => update({ readAloud: on })} disabled={!supported} aria-label="Read-aloud buttons" />
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

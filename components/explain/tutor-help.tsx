"use client"

// Tutor-style help shared by quiz, practice, Learn and adaptive practice:
// - HintLadder (before answering): the question's written hint (free, instant),
//   then "Show the first step" through the Explain panel (one Explain message,
//   never the final answer). Guides without written hints go straight to step 2.
// - CheckWorkButton (after a wrong answer): the student snaps or picks a photo
//   of their working and the Explain panel finds the first wrong step.
// Both render nothing outside an ExplainProvider.

import { useRef, useState } from 'react'
import { Camera, Footprints, Lightbulb, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InlineMarkdown } from '@/components/formats/study-markdown'
import { imageToJpeg } from '@/lib/uploads/prepare'
import { uploadKind } from '@/lib/uploads/kinds'
import { useExplain, type ExplainRequest } from './explain-context'

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)
const letter = (i: number) => String.fromCharCode(65 + i)

/** The question as text for the Explain panel: stem, options, and figure spec. */
export function questionText(q: { prompt: string; options?: string[]; figure?: string }): string {
  const lines = [q.prompt]
  q.options?.forEach((o, i) => lines.push(`${letter(i)}) ${o}`))
  if (q.figure) lines.push('(The question shows a figure described by this spec:)', q.figure)
  return lines.join('\n')
}

export function firstStepAsk(q: { prompt: string; options?: string[]; figure?: string }): ExplainRequest {
  return {
    label: `Show me the first step: “${clip(q.prompt.split('\n')[0], 100)}”`,
    prompt: `Show me the first step for this question. I haven't answered it yet, so don't give the final answer or say which option is right.\n\n${questionText(q)}`,
  }
}

export function HintLadder({ hint, question, onUse, className }: {
  hint?: string
  question: { prompt: string; options?: string[]; figure?: string }
  /** Called the first time the student opens any help on this question. */
  onUse?: () => void
  className?: string
}) {
  const explain = useExplain()
  const [shown, setShown] = useState(false)
  const [stepAsked, setStepAsked] = useState(false)
  if (!explain && !hint) return null

  const askStep = () => {
    if (!explain) return
    onUse?.()
    setStepAsked(true)
    explain.ask(firstStepAsk(question))
  }

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => { onUse?.(); if (hint) setShown(true); else askStep() }}
        className={cn('mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 print:hidden', className)}
      >
        <Lightbulb className="h-3.5 w-3.5" /> {hint ? 'Hint' : 'Show me the first step'}
      </button>
    )
  }
  return (
    <div className={cn('mt-4 animate-fade-up rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-inset ring-amber-200 print:hidden', className)}>
      <p className="flex gap-2 text-sm leading-relaxed text-amber-950">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <span><InlineMarkdown text={hint ?? ''} /></span>
      </p>
      {explain && (
        <button
          type="button"
          onClick={askStep}
          disabled={stepAsked}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:underline disabled:no-underline disabled:opacity-60"
        >
          <Footprints className="h-3.5 w-3.5" /> {stepAsked ? 'First step is in the Explain panel' : 'Still stuck? Show me the first step'}
        </button>
      )}
    </div>
  )
}

/** A photo (any format, HEIC too) as a small JPEG data URL for the Explain panel. */
export async function photoToDataUrl(file: File): Promise<string> {
  const jpeg = await imageToJpeg(file, uploadKind(file.name, file.type) === 'heic')
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the photo'))
    reader.readAsDataURL(jpeg)
  })
}

export const PHOTO_ACCEPT = 'image/*,.heic,.heif'

export function CheckWorkButton({ question, correctAnswer, given, className }: {
  question: { prompt: string; options?: string[]; figure?: string }
  correctAnswer?: string
  given?: string
  className?: string
}) {
  const explain = useExplain()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  if (!explain) return null

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const image = await photoToDataUrl(file)
      const lines = ['Here is a photo of my work on this question. Where did I go wrong?', '', questionText(question)]
      if (correctAnswer) lines.push(`Correct answer: ${correctAnswer}`)
      if (given) lines.push(`I answered: ${given}`)
      explain.ask({ label: `Check my work: “${clip(question.prompt.split('\n')[0], 100)}”`, prompt: lines.join('\n'), image })
    } catch {
      explain.ask({ label: 'Check my work', prompt: "I tried to send a photo of my work but it couldn't be opened. Tell me in one sentence to try a JPG or PNG photo." })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Take or choose a photo of your working, and see where it went wrong"
        className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 print:hidden', className)}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 text-blue-600" />} Check my work
      </button>
    </>
  )
}

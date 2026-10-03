"use client"

import { useState } from 'react'
import { InlineMarkdown } from './study-markdown'
import { splitExplanation } from '@/lib/formats/explanation'

/** A feedback explanation trimmed to its first sentence or two, with "More" for the rest. */
export function ExplanationText({ text }: { text: string }) {
  const [openFor, setOpenFor] = useState<string | null>(null)
  const { short, rest } = splitExplanation(text)
  if (!rest || openFor === text) return <InlineMarkdown text={text} />
  return (
    <>
      <InlineMarkdown text={short} />{' '}
      <button type="button" onClick={() => setOpenFor(text)} className="font-semibold text-blue-700 hover:underline print:hidden">More</button>
    </>
  )
}

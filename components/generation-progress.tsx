"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

interface GenerationProgressProps {
  isGenerating: boolean
}

const thinkingVerbs = [
  "Analyzing",
  "Extracting",
  "Synthesizing",
  "Structuring",
  "Organizing",
  "Formatting",
  "Optimizing",
  "Crafting",
  "Refining",
  "Polishing",
  "Composing",
  "Assembling",
  "Designing",
  "Building",
  "Shaping",
  "Weaving",
  "Constructing",
  "Formulating",
  "Arranging",
  "Perfecting",
]

export default function GenerationProgress({ isGenerating }: GenerationProgressProps) {
  const [currentMessage, setCurrentMessage] = useState(0)
  const [displayedContent, setDisplayedContent] = useState('')

  useEffect(() => {
    if (!isGenerating) {
      setCurrentMessage(0)
      setDisplayedContent('')
      return
    }

    // Rotate through thinking messages faster
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % thinkingVerbs.length)
    }, 2000)

    return () => clearInterval(messageInterval)
  }, [isGenerating])

  if (!isGenerating) return null

  return (
    <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Thinking header with sparkles */}
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
            <p className="text-sm font-medium text-blue-900">
              {thinkingVerbs[currentMessage]}...
            </p>
          </div>

          {/* Content preview box */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto font-mono text-sm">
            {displayedContent ? (
              <div className="whitespace-pre-wrap text-gray-800">
                {displayedContent}
                <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center space-y-2">
                  <Sparkles className="h-8 w-8 animate-pulse mx-auto" />
                  <p className="text-sm">Generating your study guide...</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse" style={{ width: '70%' }} />
            </div>
            <p className="text-xs text-gray-600 text-center">
              This usually takes 30-45 seconds
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Streaming version that shows actual content as it's generated
interface StreamingGenerationProgressProps {
  content: string
  statusMessage: string
  isComplete: boolean
}

const streamingThinkingVerbs = [
  "Analyzing",
  "Extracting",
  "Synthesizing",
  "Structuring",
  "Organizing",
  "Formatting",
  "Optimizing",
  "Crafting",
  "Refining",
  "Polishing",
  "Composing",
  "Assembling",
  "Marinating",
  "Cogitating",
  "Brewing",
  "Envisioning",
  "Tinkering",
  "Schlepping",
  "Pondering",
  "Conjuring",
]

export function StreamingGenerationProgress({ content, statusMessage, isComplete }: StreamingGenerationProgressProps) {
  const [currentVerb, setCurrentVerb] = useState(0)

  useEffect(() => {
    if (isComplete) return

    const interval = setInterval(() => {
      setCurrentVerb(prev => (prev + 1) % streamingThinkingVerbs.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [isComplete])

  // Calculate more accurate progress based on content length
  const estimatedFullLength = 3000 // Typical study guide length
  const currentLength = content.length
  const calculatedProgress = Math.min(95, Math.floor((currentLength / estimatedFullLength) * 100))
  const progressWidth = isComplete ? 100 : (content ? Math.max(20, calculatedProgress) : 5)

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 shadow-2xl">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            {!isComplete && <Sparkles className="h-6 w-6 text-white animate-pulse" />}
            {isComplete && (
              <div className="h-6 w-6 rounded-full bg-green-400 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h2 className="text-2xl font-bold text-white">
              {!isComplete ? streamingThinkingVerbs[currentVerb] + '...' : 'Complete!'}
            </h2>
          </div>
          <p className="text-blue-100 text-sm">{statusMessage}</p>
        </div>
      </div>

      {/* Content preview card with gradient border */}
      <Card className="border-2 border-blue-300 shadow-2xl overflow-hidden">
        <CardContent className="p-6">
          {/* Content preview box */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-blue-200 rounded-xl p-6 min-h-[300px] max-h-[450px] overflow-y-auto shadow-inner">
            {content ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 font-sans leading-relaxed">
                  {content}
                  {!isComplete && (
                    <span className="inline-block w-2 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse ml-1 rounded-sm" />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <Sparkles className="h-12 w-12 text-blue-400 animate-pulse mx-auto" />
                  <p className="text-gray-500 font-medium">Preparing your study guide...</p>
                </div>
              </div>
            )}
          </div>

          {isComplete && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-medium shadow-lg">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Study guide generated successfully!
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

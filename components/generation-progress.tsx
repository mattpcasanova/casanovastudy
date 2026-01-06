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
  loadingText?: string // Customizable loading text, defaults to "Preparing your study guide..."
  completeText?: string // Customizable completion text, defaults to "Study guide generated successfully!"
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

export function StreamingGenerationProgress({
  content,
  statusMessage,
  isComplete,
  loadingText = "Preparing your study guide...",
  completeText = "Study guide generated successfully!"
}: StreamingGenerationProgressProps) {
  const [currentVerb, setCurrentVerb] = useState(0)
  const [wavePosition, setWavePosition] = useState(0)

  useEffect(() => {
    if (isComplete) return

    const interval = setInterval(() => {
      setCurrentVerb(prev => (prev + 1) % streamingThinkingVerbs.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [isComplete])

  // Wave animation - move through each character
  useEffect(() => {
    if (isComplete) return

    const currentText = streamingThinkingVerbs[currentVerb] + '...'
    const interval = setInterval(() => {
      setWavePosition(prev => (prev + 1) % (currentText.length + 5))
    }, 80)

    return () => clearInterval(interval)
  }, [isComplete, currentVerb])

  // Render text with wave effect
  const renderWaveText = () => {
    const text = streamingThinkingVerbs[currentVerb] + '...'
    return text.split('').map((char, index) => {
      const distance = Math.abs(wavePosition - index)
      const isActive = distance < 2
      const scale = isActive ? 1.2 : 1

      // Calculate color based on position in word for gradient effect
      const progress = index / text.length
      const baseColor = `rgb(${59 + progress * 80}, ${130 + progress * 22}, ${246 - progress * 86})`

      return (
        <span
          key={index}
          style={{
            display: 'inline-block',
            transform: `scale(${scale})`,
            transition: 'all 0.15s ease',
            color: isActive ? 'white' : baseColor,
            textShadow: isActive ? '0 0 20px rgba(255,255,255,0.8), 0 0 10px rgba(255,255,255,0.6)' : 'none',
          }}
        >
          {char}
        </span>
      )
    })
  }

  // Calculate more accurate progress based on content length
  const estimatedFullLength = 3000 // Typical study guide length
  const currentLength = content.length
  const calculatedProgress = Math.min(95, Math.floor((currentLength / estimatedFullLength) * 100))
  const progressWidth = isComplete ? 100 : (content ? Math.max(20, calculatedProgress) : 5)

  return (
    <div className="space-y-6">
      {/* Header with white background and outline */}
      <div className="bg-white border-4 border-blue-500 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 pointer-events-none" />

        <div className="text-center space-y-3 relative z-10">
          <div className="flex items-center justify-center gap-3">
            {!isComplete && <Sparkles className="h-6 w-6 text-blue-500 animate-pulse" />}
            {isComplete && (
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h2 className="text-3xl font-bold">
              {!isComplete ? renderWaveText() : <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Complete!</span>}
            </h2>
          </div>
          <p className="text-gray-600 text-sm font-medium">{statusMessage}</p>
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
                  <p className="text-gray-500 font-medium">{loadingText}</p>
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
                {completeText}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

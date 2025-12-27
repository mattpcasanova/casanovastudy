"use client"

import { useState } from 'react'
import Link from 'next/link'
import { StudyGuideRecord } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Download, Share2, Home, Printer } from 'lucide-react'
import NavigationHeader from '@/components/navigation-header'
import { useAuth } from '@/lib/auth'
import OutlineFormat from '@/components/formats/outline-format'
import FlashcardsFormat from '@/components/formats/flashcards-format'
import QuizFormat from '@/components/formats/quiz-format'
import SummaryFormat from '@/components/formats/summary-format'

interface StudyGuideViewerProps {
  studyGuide: StudyGuideRecord
}

export default function StudyGuideViewer({ studyGuide }: StudyGuideViewerProps) {
  const { user, signOut } = useAuth()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handlePrintToPDF = () => {
    window.print()
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studyGuideId: studyGuide.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${studyGuide.title}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: studyGuide.title,
          text: `Check out this ${studyGuide.subject} study guide!`,
          url: window.location.href
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const renderFormat = () => {
    switch (studyGuide.format) {
      case 'outline':
        return <OutlineFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'flashcards':
        return <FlashcardsFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'quiz':
        return <QuizFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'summary':
        return <SummaryFormat content={studyGuide.content} subject={studyGuide.subject} />
      default:
        return <SummaryFormat content={studyGuide.content} subject={studyGuide.subject} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <div className="print:hidden">
        <NavigationHeader
          user={user}
          onSignOut={signOut}
        />
      </div>

      {/* Title Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white print:hidden">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              {studyGuide.title}
            </h1>
            <p className="text-xs sm:text-sm opacity-75">
              Grade Level: {studyGuide.grade_level} • Format: {studyGuide.format.charAt(0).toUpperCase() + studyGuide.format.slice(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons - Floating */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 print:hidden">
        <Button
          onClick={handlePrintToPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="lg"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print to PDF
        </Button>
        <Button
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF}
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          className="bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-300 shadow-lg"
          size="lg"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button
          asChild
          variant="outline"
          className="bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-300 shadow-lg"
          size="lg"
        >
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {renderFormat()}
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <div className="text-center mb-8 pb-4 border-b-2 border-blue-600">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">{studyGuide.title}</h1>
          <p className="text-lg text-gray-600">{studyGuide.subject} • Grade {studyGuide.grade_level}</p>
          <p className="text-sm text-gray-500 mt-2">Generated with CasanovaStudy</p>
        </div>
      </div>
    </div>
  )
}

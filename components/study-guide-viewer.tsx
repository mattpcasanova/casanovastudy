"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StudyGuideRecord } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Download, Share2, Home, Printer, Trash2, Mail, BookmarkPlus, Menu, X, Pencil } from 'lucide-react'
import NavigationHeader from '@/components/navigation-header'
import { useAuth } from '@/lib/auth'
import OutlineFormat from '@/components/formats/outline-format'
import FlashcardsFormat from '@/components/formats/flashcards-format'
import QuizFormat from '@/components/formats/quiz-format'
import SummaryFormat from '@/components/formats/summary-format'
import CustomFormat from '@/components/formats/custom-format'
import EmailShareDialog from '@/components/email-share-dialog'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

interface StudyGuideViewerProps {
  studyGuide: StudyGuideRecord
}

export default function StudyGuideViewer({ studyGuide }: StudyGuideViewerProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isOwner = user?.id === studyGuide.user_id
  // Allow saving if user is logged in and doesn't own the guide
  // This includes anonymous guides (user_id is null) and other users' guides
  const canSave = user && !isOwner

  const handleSaveToMyGuides = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/study-guides/copy', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studyGuideId: studyGuide.id,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save study guide')
      }

      const data = await response.json()
      toast({
        title: "Success!",
        description: "Study guide saved to your collection.",
      })
      router.push(data.studyGuideUrl)
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save study guide',
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/study-guides/${studyGuide.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete study guide')
      }

      router.push('/my-guides')
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete study guide',
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

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
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
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
      toast({
        title: "Success!",
        description: "Link copied to clipboard!",
      })
    }
  }

  const renderFormat = () => {
    switch (studyGuide.format) {
      case 'outline':
        return <OutlineFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'flashcards':
        return <FlashcardsFormat content={studyGuide.content} subject={studyGuide.subject} studyGuideId={studyGuide.id} userId={user?.id} />
      case 'quiz':
        return <QuizFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'summary':
        return <SummaryFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'custom':
        if (studyGuide.custom_content) {
          return <CustomFormat content={studyGuide.custom_content} studyGuideId={studyGuide.id} />
        }
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
        <div className="container mx-auto px-4 py-10">
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

      {/* Save Banner - Show for logged-in users viewing someone else's guide */}
      {canSave && (
        <div className="bg-blue-50 border-b-2 border-blue-200 print:hidden">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-blue-800">
                <BookmarkPlus className="h-5 w-5" />
                <span className="text-sm sm:text-base font-medium">
                  Like this study guide? Save it to your collection!
                </span>
              </div>
              <Button
                onClick={handleSaveToMyGuides}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <BookmarkPlus className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save to My Guides'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Menu */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden">
        {/* Expandable Menu */}
        <div className={`flex flex-col gap-2 mb-3 transition-all duration-300 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {canSave && (
            <Button
              onClick={() => { handleSaveToMyGuides(); setIsMenuOpen(false); }}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              size="lg"
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save to My Guides'}
            </Button>
          )}
          <Button
            onClick={() => { handlePrintToPDF(); setIsMenuOpen(false); }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            size="lg"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print to PDF
          </Button>
          <Button
            onClick={() => { handleGeneratePDF(); setIsMenuOpen(false); }}
            disabled={isGeneratingPDF}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button
            onClick={() => { handleShare(); setIsMenuOpen(false); }}
            variant="outline"
            className="bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-300 shadow-lg"
            size="lg"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <EmailShareDialog
            studyGuideTitle={studyGuide.title}
            studyGuideUrl={typeof window !== 'undefined' ? window.location.href : ''}
            senderName={user?.first_name || undefined}
            trigger={
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-300 shadow-lg"
                size="lg"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            }
          />
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
          {isOwner && studyGuide.format === 'custom' && (
            <Button
              asChild
              variant="outline"
              className="bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border-blue-300 shadow-lg"
              size="lg"
            >
              <Link href={`/create-guide?edit=${studyGuide.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Guide
              </Link>
            </Button>
          )}
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border-red-300 shadow-lg"
                  size="lg"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Study Guide</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{studyGuide.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`h-14 w-14 rounded-full shadow-xl transition-all duration-300 ${isMenuOpen ? 'bg-gray-700 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'}`}
          size="icon"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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

      <Toaster />
    </div>
  )
}

"use client"

import { useEffect, useState } from 'react'
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
import { Share2, Printer, Download, Loader2, Trash2, Mail, BookmarkPlus, Menu, X, Pencil, School, List, CreditCard, HelpCircle, ScrollText, Sparkles, Puzzle, Map as MapIcon, ArrowLeft, FileText, History } from 'lucide-react'
import NavigationHeader from '@/components/navigation-header'
import { useAuth } from '@/lib/auth'
import OutlineFormat from '@/components/formats/outline-format'
import FlashcardsFormat from '@/components/formats/flashcards-format'
import QuizFormat from '@/components/formats/quiz-format'
import SummaryFormat from '@/components/formats/summary-format'
import PracticeFormat from '@/components/formats/practice-format'
import PlanFormat from '@/components/formats/plan-format'
import CheatSheetFormat from '@/components/formats/cheatsheet-format'
import TimelineFormat from '@/components/formats/timeline-format'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/auth-fetch'
import { CLASSES_ENABLED } from '@/lib/features'
import { displaySubject, displayLevel } from '@/lib/study-options'
import CustomFormat from '@/components/formats/custom-format'
import EmailShareDialog from '@/components/email-share-dialog'
import AssignToClassDialog from '@/components/assign-to-class-dialog'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, formatAccent } from '@/lib/formats/design'
import PageBanner from '@/components/page-banner'
import LearnCallout from '@/components/learn/learn-callout'
import { DesmosProvider } from '@/components/desmos/desmos-calculator'
import { ExplainProvider } from '@/components/explain/explain-provider'
import { StudyResultsProvider } from '@/components/study-results-context'
import { calculatorFor } from '@/lib/formats/figures'

const FORMAT_META = {
  outline: { accent: formatAccent.outline, icon: List, label: 'Outline' },
  flashcards: { accent: formatAccent.flashcards, icon: CreditCard, label: 'Flashcards' },
  quiz: { accent: formatAccent.quiz, icon: HelpCircle, label: 'Quiz' },
  summary: { accent: formatAccent.summary, icon: ScrollText, label: 'Summary' },
  practice: { accent: formatAccent.practice, icon: Puzzle, label: 'Practice' },
  plan: { accent: formatAccent.plan, icon: MapIcon, label: 'Study plan' },
  cheatsheet: { accent: formatAccent.cheatsheet, icon: FileText, label: 'Cheat sheet' },
  timeline: { accent: formatAccent.timeline, icon: History, label: 'Timeline' },
  custom: { accent: formatAccent.outline, icon: Sparkles, label: 'Custom' },
} as const

interface StudyGuideViewerProps {
  studyGuide: StudyGuideRecord
}

export default function StudyGuideViewer({ studyGuide }: StudyGuideViewerProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [parentPlan, setParentPlan] = useState<{ id: string; title: string } | null>(null)

  // Guides generated from a study plan unit link back to the plan.
  useEffect(() => {
    if (!studyGuide.parent_guide_id) return
    supabase
      .from('study_guides')
      .select('id, title')
      .eq('id', studyGuide.parent_guide_id)
      .single()
      .then(({ data }) => { if (data) setParentPlan(data) })
  }, [studyGuide.parent_guide_id])

  const isOwner = user?.id === studyGuide.user_id
  const isTeacherOwner = CLASSES_ENABLED && isOwner && user?.user_type === 'teacher'
  // Allow saving if user is logged in and doesn't own the guide
  // This includes anonymous guides (user_id is null) and other users' guides
  const canSave = user && !isOwner
  const fmt = FORMAT_META[studyGuide.format as keyof typeof FORMAT_META] ?? FORMAT_META.summary
  // Desmos only where the real test gives one (math/science); none for plans/timelines.
  const calculatorMode = studyGuide.format === 'plan' || studyGuide.format === 'timeline'
    ? null
    : calculatorFor({ subject: studyGuide.subject, text: [studyGuide.title, studyGuide.topic_focus].filter(Boolean).join('\n') })

  const handleSaveToMyGuides = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const response = await authFetch('/api/study-guides/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyGuideId: studyGuide.id }),
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
      // The API identifies the owner from the session token, not the body.
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/study-guides/${studyGuide.id}`, {
        method: 'DELETE',
        credentials: 'omit',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
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

  // Server renders this page in print mode via PDFShift, so the file matches Print.
  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sign in to download PDFs.')
      const res = await fetch(`/api/pdf/guide/${studyGuide.id}`, {
        credentials: 'omit',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not create the PDF.')
      }
      const url = URL.createObjectURL(await res.blob())
      const match = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)
      const a = document.createElement('a')
      a.href = url
      a.download = match?.[1] || 'study-guide.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Could not create the PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsDownloading(false)
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
        return <OutlineFormat content={studyGuide.content} subject={studyGuide.subject} studyGuideId={studyGuide.id} />
      case 'flashcards':
        return <FlashcardsFormat content={studyGuide.content} subject={studyGuide.subject} studyGuideId={studyGuide.id} userId={user?.id} />
      case 'quiz':
        return <QuizFormat content={studyGuide.content} subject={studyGuide.subject} title={studyGuide.title} gradeLevel={studyGuide.grade_level} />
      case 'summary':
        return <SummaryFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'practice':
        return <PracticeFormat content={studyGuide.content} subject={studyGuide.subject} />
      case 'plan':
        return <PlanFormat content={studyGuide.content} studyGuideId={studyGuide.id} title={studyGuide.title} subject={studyGuide.subject} gradeLevel={studyGuide.grade_level} isOwner={isOwner} />
      case 'cheatsheet':
        return <CheatSheetFormat content={studyGuide.content} />
      case 'timeline':
        return <TimelineFormat content={studyGuide.content} />
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
    <div className={cn(displaySerif.variable, 'min-h-screen bg-slate-50 print:min-h-0 print:bg-white')}>
      {/* Navigation Header */}
      <div className="print:hidden">
        <NavigationHeader />
      </div>

      {/* Title Banner */}
      <PageBanner
        title={studyGuide.title}
        label={fmt.label}
        meta={[displaySubject(studyGuide.subject), displayLevel(studyGuide.grade_level)].filter(Boolean).join(' · ') || undefined}
        accent={fmt.accent}
        icon={fmt.icon}
        onBack={() => router.back()}
      />

      {parentPlan && (
        <div className="border-b border-teal-100 bg-teal-50 print:hidden">
          <div className="container mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
            <Link href={`/study-guide/${parentPlan.id}`} className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" /> Back to plan
            </Link>
            <span className="text-teal-900/70">
              Part of <span className="font-medium text-teal-900">{parentPlan.title}</span>
              {studyGuide.plan_unit && <> · Unit {studyGuide.plan_unit.replace(/^u/, '')}</>}
            </span>
          </div>
        </div>
      )}

      {/* Save Banner - Show for logged-in users viewing someone else's guide */}
      {canSave && (
        <div className="bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <BookmarkPlus className="h-5 w-5" />
                <span className="text-sm sm:text-base font-medium">
                  Like this study guide? Save it to your collection.
                </span>
              </div>
              <Button
                onClick={handleSaveToMyGuides}
                disabled={isSaving}
                className={cn(fmt.accent.solid, fmt.accent.hover, 'text-white')}
              >
                <BookmarkPlus className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save to My Guides'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Menu */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden">
        {/* Expandable Menu */}
        <div className={`flex flex-col gap-2 mb-3 transition-all duration-300 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {canSave && (
            <Button
              onClick={() => { handleSaveToMyGuides(); setIsMenuOpen(false); }}
              disabled={isSaving}
              className={cn(fmt.accent.solid, fmt.accent.hover, 'text-white shadow-lg')}
              size="lg"
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save to My Guides'}
            </Button>
          )}
          {isTeacherOwner && (
            <AssignToClassDialog
              studyGuideIds={[studyGuide.id]}
              studyGuideTitle={studyGuide.title}
              trigger={
                <Button
                  variant="outline"
                  className="bg-white hover:bg-green-50 text-green-700 hover:text-green-800 border-green-300 shadow-lg"
                  size="lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <School className="h-4 w-4 mr-2" />
                  Assign to Class
                </Button>
              }
            />
          )}
          <Button
            onClick={() => { handlePrintToPDF(); setIsMenuOpen(false); }}
            className={cn(fmt.accent.solid, fmt.accent.hover, 'text-white shadow-lg')}
            size="lg"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print to PDF
          </Button>
          {user && (
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              variant="outline"
              className="bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-300 shadow-lg"
              size="lg"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {isDownloading ? 'Preparing PDF…' : 'Download PDF'}
            </Button>
          )}
          <Button
            onClick={() => { handleShare(); setIsMenuOpen(false); }}
            variant="outline"
            className="bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-300 shadow-lg"
            size="lg"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          {user && <EmailShareDialog
            studyGuideId={studyGuide.id}
            studyGuideTitle={studyGuide.title}
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
          />}
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
          className={cn('h-14 w-14 rounded-full shadow-xl transition-all duration-300', isMenuOpen ? 'bg-slate-700 hover:bg-slate-800' : cn(fmt.accent.solid, fmt.accent.hover))}
          size="icon"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Print-only header — must come before the content so it prints on page 1 */}
      <header className="hidden print:block">
        <div className="mb-6 border-b-2 border-slate-800 pb-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {[fmt.label, displaySubject(studyGuide.subject), displayLevel(studyGuide.grade_level)].filter(Boolean).join(' · ')}
          </p>
          <h1 className={cn(fontDisplay, 'mt-1 text-3xl font-semibold leading-tight text-slate-900')}>{studyGuide.title}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="mx-auto max-w-3xl"><LearnCallout guide={studyGuide} /></div>
        <DesmosProvider guideId={studyGuide.id} mode={calculatorMode} showButton={false}>
          <ExplainProvider guideId={studyGuide.id}>
            <StudyResultsProvider guideId={studyGuide.id} subject={studyGuide.subject}>{renderFormat()}</StudyResultsProvider>
          </ExplainProvider>
        </DesmosProvider>
      </div>

      <p className="hidden pt-6 text-center text-[0.7rem] text-slate-400 print:block">Made with Casanova Study</p>

      <Toaster />
    </div>
  )
}

"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import NavigationHeader from '@/components/navigation-header'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ClipboardList,
  Plus,
  Filter,
  ArrowUpDown,
  Trash2,
  Download,
  X,
  Loader2,
  Pencil,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react'
import { EditReportDialog } from '@/components/edit-report-dialog'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay } from '@/lib/formats/design'
import { LibraryHeader, SearchBox, SelectToggle, relativeDate, CardSkeletonGrid } from '@/components/library/library-parts'

// Score colour bands (literal classes so Tailwind keeps them).
function scoreBand(pct: number) {
  if (pct >= 90) return { text: 'text-emerald-600', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', avatar: 'bg-emerald-100 text-emerald-700' }
  if (pct >= 80) return { text: 'text-blue-600', bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', avatar: 'bg-blue-100 text-blue-700' }
  if (pct >= 70) return { text: 'text-amber-600', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700', avatar: 'bg-amber-100 text-amber-700' }
  if (pct >= 60) return { text: 'text-orange-600', bar: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700', avatar: 'bg-orange-100 text-orange-700' }
  return { text: 'text-rose-600', bar: 'bg-rose-400', badge: 'bg-rose-50 text-rose-700', avatar: 'bg-rose-100 text-rose-700' }
}

interface GradingResult {
  id: string
  student_name: string
  student_first_name: string | null
  student_last_name: string | null
  student_user_id: string | null
  answer_sheet_filename: string | null
  student_exam_filename: string
  original_filename: string | null
  total_marks: number
  total_possible_marks: number
  percentage: number
  grade: string
  created_at: string
  user_id: string
  class_name: string | null
  class_period: string | null
  exam_title: string | null
  assignment_submission_id: string | null
  grade_breakdown?: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }>
}

export default function GradedExamsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter, sort, and search state
  const [classFilter, setClassFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [examTitleFilter, setExamTitleFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [privacyMode, setPrivacyMode] = useState(false)

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return

    const idsToDelete = Array.from(selectedIds)
    setDeletingIds(new Set(idsToDelete))

    try {
      const results = await Promise.allSettled(
        idsToDelete.map(id =>
          fetch(`/api/grading-results/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          })
        )
      )

      const successfulDeletes = idsToDelete.filter((_, index) =>
        results[index].status === 'fulfilled' &&
        (results[index] as PromiseFulfilledResult<Response>).value.ok
      )

      setGradingResults(prev => prev.filter(result => !successfulDeletes.includes(result.id)))
      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)

      const failedCount = idsToDelete.length - successfulDeletes.length
      if (failedCount > 0) {
        alert(`${successfulDeletes.length} reports deleted. ${failedCount} failed to delete.`)
      }
    } catch (err) {
      console.error('Error bulk deleting:', err)
      alert('Failed to delete some reports')
    } finally {
      setDeletingIds(new Set())
    }
  }

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return
    setIsDownloading(true)

    try {
      // Fetch full data for selected reports
      const selectedResults = gradingResults.filter(r => selectedIds.has(r.id))

      // Fetch grade_breakdown for each selected report
      const { data: fullResults, error: fetchError } = await supabase
        .from('grading_results')
        .select('id, student_name, total_marks, total_possible_marks, percentage, grade, grade_breakdown, created_at')
        .in('id', Array.from(selectedIds))

      if (fetchError) throw fetchError

      // Create a single printable document with all reports
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow pop-ups for this site to download reports')
        return
      }

      const reportsHtml = (fullResults || []).map(result => {
        const breakdown = result.grade_breakdown || []
        return `
          <div class="report" style="page-break-after: always;">
            <div class="header">
              <h1>Exam Grading Report</h1>
              <p>${result.student_name} - ${new Date(result.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div class="summary">
              <div class="summary-item">
                <div class="value">${result.total_marks}/${result.total_possible_marks}</div>
                <div class="label">Total Marks</div>
              </div>
              <div class="summary-item">
                <div class="value">${result.percentage.toFixed(1)}%</div>
                <div class="label">Percentage</div>
              </div>
              <div class="summary-item">
                <div class="value">${result.grade}</div>
                <div class="label">Grade</div>
              </div>
            </div>

            <div class="section-title">Question Breakdown</div>
            ${breakdown.map((item: { questionNumber: string; marksAwarded: number; marksPossible: number; explanation: string }) => {
              const pct = item.marksPossible > 0 ? (item.marksAwarded / item.marksPossible) * 100 : 0
              const marksClass = pct === 100 ? 'marks-full' : pct >= 70 ? 'marks-good' : pct >= 50 ? 'marks-ok' : 'marks-low'
              const displayNum = /^(Question|Section|Q\d)/i.test(item.questionNumber) ? item.questionNumber : 'Question ' + item.questionNumber
              return `
                <div class="question">
                  <div class="question-header">
                    <span class="question-num">${displayNum}</span>
                    <span class="question-marks ${marksClass}">${item.marksAwarded}/${item.marksPossible} marks</span>
                  </div>
                  <p class="explanation">${item.explanation}</p>
                </div>
              `
            }).join('')}
          </div>
        `
      }).join('')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Grade Reports - Batch Download</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 30px 40px; color: #1f2937; line-height: 1.5; }
            .report { max-width: 900px; margin: 0 auto 40px; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
            .header h1 { font-size: 28px; color: #111827; margin-bottom: 8px; }
            .header p { color: #6b7280; font-size: 14px; }
            .summary { display: flex; justify-content: space-around; margin: 30px 0; padding: 24px; background: #f9fafb; border-radius: 8px; }
            .summary-item { text-align: center; flex: 1; }
            .summary-item .value { font-size: 32px; font-weight: bold; color: #3b82f6; }
            .summary-item .label { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .section-title { font-size: 18px; font-weight: 600; margin: 28px 0 16px; color: #374151; }
            .question { padding: 18px 20px; margin-bottom: 14px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
            .question-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 12px; }
            .question-num { font-weight: 600; font-size: 15px; }
            .question-marks { font-size: 14px; padding: 5px 14px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
            .marks-full { background: #dcfce7; color: #166534; }
            .marks-good { background: #dbeafe; color: #1e40af; }
            .marks-ok { background: #fef3c7; color: #92400e; }
            .marks-low { background: #fee2e2; color: #991b1b; }
            .explanation { font-size: 14px; color: #4b5563; line-height: 1.6; }
            @media print {
              body { padding: 15px 20px; }
              .report { page-break-after: always; }
              .question { break-inside: avoid; }
            }
            @page { margin: 0.5in; size: letter; }
          </style>
        </head>
        <body>
          ${reportsHtml}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `)
      printWindow.document.close()
    } catch (err) {
      console.error('Error downloading reports:', err)
      alert('Failed to download reports')
    } finally {
      setIsDownloading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedResults.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedResults.map(r => r.id)))
    }
  }

  const handleEditSave = (updatedReports: GradingResult[]) => {
    // Update local state with edited reports
    setGradingResults(prev => {
      const updatedMap = new Map(updatedReports.map(r => [r.id, r]))
      return prev.map(result =>
        updatedMap.has(result.id) ? updatedMap.get(result.id)! : result
      )
    })
    // Clear selection after edit
    setSelectedIds(new Set())
  }

  useEffect(() => {
    async function fetchMyResults() {
      if (authLoading) return

      if (!user) {
        router.push('/auth/signin')
        return
      }

      try {
        setResultsLoading(true)
        const { data, error: fetchError } = await supabase
          .from('grading_results')
          .select('id, student_name, student_first_name, student_last_name, student_user_id, answer_sheet_filename, student_exam_filename, original_filename, total_marks, total_possible_marks, percentage, grade, created_at, user_id, class_name, class_period, exam_title, assignment_submission_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        setGradingResults(data || [])
      } catch (err) {
        console.error('Error fetching grading results:', err)
        setError(err instanceof Error ? err.message : 'Failed to load grading results')
      } finally {
        setResultsLoading(false)
      }
    }

    fetchMyResults()
  }, [user, authLoading, router])



  const getDisplayName = (result: GradingResult) => {
    if (result.student_first_name || result.student_last_name) {
      return [result.student_first_name, result.student_last_name].filter(Boolean).join(' ')
    }
    return result.student_name
  }

  const getFilenameTitle = (result: GradingResult) => {
    // Prefer exam_title (populated for assignment-based grades) over filename
    if (result.exam_title) return result.exam_title
    const filename = result.original_filename || result.student_exam_filename
    return filename.replace(/\.(pdf|jpg|jpeg|png|heic|heif|webp)$/i, '')
  }

  const getSortName = (result: GradingResult) => {
    if (result.student_last_name) {
      return result.student_last_name
    }
    return result.student_name
  }

  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...gradingResults]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(result =>
        result.student_name.toLowerCase().includes(query) ||
        (result.student_first_name && result.student_first_name.toLowerCase().includes(query)) ||
        (result.student_last_name && result.student_last_name.toLowerCase().includes(query)) ||
        result.student_exam_filename.toLowerCase().includes(query) ||
        (result.original_filename && result.original_filename.toLowerCase().includes(query)) ||
        (result.exam_title && result.exam_title.toLowerCase().includes(query))
      )
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(result => result.class_name === classFilter)
    }

    if (periodFilter !== 'all') {
      filtered = filtered.filter(result => result.class_period === periodFilter)
    }

    if (examTitleFilter !== 'all') {
      filtered = filtered.filter(result => result.exam_title === examTitleFilter)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name-asc':
          return getSortName(a).localeCompare(getSortName(b))
        case 'name-desc':
          return getSortName(b).localeCompare(getSortName(a))
        default:
          return 0
      }
    })

    return filtered
  }, [gradingResults, classFilter, periodFilter, examTitleFilter, sortBy, searchQuery])

  const availableClasses = useMemo(() => {
    const classes = new Set(gradingResults.map(result => result.class_name).filter(Boolean) as string[])
    return Array.from(classes).sort()
  }, [gradingResults])

  const availablePeriods = useMemo(() => {
    const periods = new Set(gradingResults.map(result => result.class_period).filter(Boolean) as string[])
    return Array.from(periods).sort()
  }, [gradingResults])

  const availableExamTitles = useMemo(() => {
    const titles = new Set(gradingResults.map(result => result.exam_title).filter(Boolean) as string[])
    return Array.from(titles).sort()
  }, [gradingResults])

  const hasActiveFilters = classFilter !== 'all' || periodFilter !== 'all' || examTitleFilter !== 'all' || searchQuery.trim()

  const selecting = selectedIds.size > 0
  const clearFilters = () => {
    setClassFilter('all')
    setPeriodFilter('all')
    setExamTitleFilter('all')
    setSearchQuery('')
  }

  return (
    <div className={cn(displaySerif.variable, 'min-h-screen bg-slate-50')}>
      <NavigationHeader />

      <LibraryHeader
        title="My Reports"
        subtitle="Graded exams, ready to review and share."
        count={gradingResults.length}
        noun="report"
        actionHref="/grade-exam/batch"
        actionLabel="Grade exams"
      />

      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        {!authLoading && !resultsLoading && gradingResults.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              <SearchBox value={searchQuery} onChange={setSearchQuery} placeholder="Search by student, exam, or file…" />
              <div className="grid grid-cols-2 gap-3 sm:flex">
                {availableExamTitles.length > 0 && (
                  <Select value={examTitleFilter} onValueChange={setExamTitleFilter}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-44"><SelectValue placeholder="All exams" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All exams</SelectItem>
                      {availableExamTitles.map(title => <SelectItem key={title} value={title}>{title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {availableClasses.length > 0 && (
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-40"><SelectValue placeholder="All classes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All classes</SelectItem>
                      {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {availablePeriods.length > 0 && (
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-36"><SelectValue placeholder="All periods" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All periods</SelectItem>
                      {availablePeriods.map(p => <SelectItem key={p} value={p}>Period {p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-40">
                    <ArrowUpDown className="mr-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest first</SelectItem>
                    <SelectItem value="date-asc">Oldest first</SelectItem>
                    <SelectItem value="name-asc">Last name A–Z</SelectItem>
                    <SelectItem value="name-desc">Last name Z–A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPrivacyMode(!privacyMode)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition',
                  privacyMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
                )}
                title="Hide scores when projecting or sharing your screen"
              >
                {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {privacyMode ? 'Scores hidden' : 'Hide scores'}
              </button>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
              <span className="ml-auto text-slate-500">
                {filteredAndSortedResults.length !== gradingResults.length && `${filteredAndSortedResults.length} shown · `}
                <button type="button" onClick={toggleSelectAll} className="font-medium text-blue-700 hover:underline">
                  {selecting && selectedIds.size === filteredAndSortedResults.length ? 'Deselect all' : 'Select'}
                </button>
              </span>
            </div>
          </div>
        )}

        {(authLoading || resultsLoading) && <CardSkeletonGrid height="h-56" />}

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">{error}</div>}

        {!authLoading && !resultsLoading && !error && gradingResults.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ClipboardList className="h-8 w-8" /></span>
            <h3 className={cn(fontDisplay, 'text-2xl font-semibold text-slate-900')}>No reports yet</h3>
            <p className="mt-2 max-w-md text-slate-500">Upload a class set of papers (and your mark scheme) to get a graded report with feedback on every question.</p>
            <Button asChild size="lg" className="mt-6 bg-blue-600 hover:bg-blue-700">
              <Link href="/grade-exam/batch"><Plus className="mr-2 h-5 w-5" /> Grade your first exams</Link>
            </Button>
          </div>
        )}

        {!authLoading && !resultsLoading && !error && gradingResults.length > 0 && (
          filteredAndSortedResults.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <Filter className="mb-3 h-10 w-10 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800">No reports match</h3>
              <p className="mb-4 mt-1 text-slate-500">Try a different search or filter.</p>
              <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedResults.map((result) => {
                const displayName = getDisplayName(result)
                const isSelected = selectedIds.has(result.id)
                const band = scoreBand(result.percentage)
                const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
                return (
                  <article
                    key={result.id}
                    onClick={() => (selecting ? toggleSelection(result.id) : router.push(`/grade-report/${result.id}`))}
                    className={cn(
                      'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                      isSelected ? 'border-blue-500 ring-4 ring-blue-500/15' : 'border-slate-200 hover:border-slate-300',
                      deletingIds.has(result.id) && 'pointer-events-none opacity-50'
                    )}
                  >
                    <div className={cn('h-1.5', privacyMode ? 'bg-slate-200' : band.bar)} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start gap-3">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', privacyMode ? 'bg-slate-100 text-slate-600' : band.avatar)}>{initials}</span>
                        <div className="min-w-0 flex-1 pr-8">
                          <p className="truncate font-semibold text-slate-900">{displayName}</p>
                          <p className="truncate text-sm text-slate-500">{getFilenameTitle(result)}</p>
                        </div>
                        <SelectToggle selected={isSelected} selecting={selecting} onToggle={() => toggleSelection(result.id)} className="absolute right-4 top-5 border-slate-200" />
                      </div>

                      <div className={cn('mt-5 flex items-end justify-between gap-3 transition', privacyMode && 'select-none blur-md')} aria-hidden={privacyMode}>
                        <div>
                          <p className={cn(fontDisplay, 'text-4xl font-semibold leading-none tabular-nums', band.text)}>
                            {Math.round(result.percentage)}<span className="text-2xl">%</span>
                          </p>
                          <p className="mt-1.5 text-sm text-slate-500">{result.total_marks} / {result.total_possible_marks} marks</p>
                        </div>
                        {result.grade && (
                          <span className={cn('flex h-12 min-w-12 items-center justify-center rounded-xl px-2 text-xl font-bold', band.badge)}>{result.grade}</span>
                        )}
                      </div>
                      <div className={cn('mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100', privacyMode && 'blur-sm')}>
                        <div className={cn('h-full rounded-full', band.bar)} style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }} />
                      </div>

                      {(result.class_name || result.class_period) && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {result.class_name && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{result.class_name}</span>}
                          {result.class_period && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Period {result.class_period}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                      <span>{relativeDate(result.created_at)}</span>
                      <span className="flex items-center gap-1 font-semibold text-blue-700 opacity-0 transition group-hover:opacity-100">
                        View report <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Floating action bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-4 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? 'report' : 'reports'} selected
            </span>
            <div className="h-6 w-px bg-gray-600" />
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
              onClick={handleBulkDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
              onClick={() => setShowEditDialog(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-red-900/50 hover:text-red-300"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:bg-gray-700 hover:text-white h-8 w-8"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Reports</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} {selectedIds.size === 1 ? 'report' : 'reports'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBulkDelete}
            >
              Delete {selectedIds.size} {selectedIds.size === 1 ? 'Report' : 'Reports'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit report dialog */}
      <EditReportDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        selectedReports={gradingResults.filter(r => selectedIds.has(r.id))}
        onSave={handleEditSave}
        userId={user?.id ?? null}
      />
    </div>
  )
}

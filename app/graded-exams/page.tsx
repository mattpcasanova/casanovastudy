"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import NavigationHeader from '@/components/navigation-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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
  Calendar,
  ClipboardList,
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Trash2,
  User,
  BookOpen,
  Clock,
  Download,
  X,
  Check,
  Loader2,
  Pencil,
  Eye,
  EyeOff
} from 'lucide-react'
import { EditReportDialog } from '@/components/edit-report-dialog'

interface GradingResult {
  id: string
  student_name: string
  student_first_name: string | null
  student_last_name: string | null
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
          .select('id, student_name, student_first_name, student_last_name, answer_sheet_filename, student_exam_filename, original_filename, total_marks, total_possible_marks, percentage, grade, created_at, user_id, class_name, class_period, exam_title')
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDisplayName = (result: GradingResult) => {
    if (result.student_first_name || result.student_last_name) {
      return [result.student_first_name, result.student_last_name].filter(Boolean).join(' ')
    }
    return result.student_name
  }

  const getFilenameTitle = (result: GradingResult) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="relative">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">My Reports</h1>
              <p className="text-sm sm:text-base opacity-75">
                View and manage all your graded exam reports
              </p>
            </div>
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 absolute top-0 right-0 hidden sm:flex">
              <Link href="/grade-exam">
                <Plus className="h-5 w-5 mr-2" />
                Grade New Exam
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 mt-4 sm:hidden w-full">
              <Link href="/grade-exam">
                <Plus className="h-5 w-5 mr-2" />
                Grade New Exam
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Filters and Sort */}
        {!authLoading && !resultsLoading && gradingResults.length > 0 && (
          <Card className="mb-6 border-2">
            <CardContent className="pt-6">
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by student name, exam title, or filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Class Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter by Class
                  </label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {availableClasses.map(className => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Filter by Period
                  </label>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      {availablePeriods.map(period => (
                        <SelectItem key={period} value={period}>
                          Period {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Title Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Filter by Exam
                  </label>
                  <Select value={examTitleFilter} onValueChange={setExamTitleFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All exams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Exams</SelectItem>
                      {availableExamTitles.map(title => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="name-asc">Last Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Last Name (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active filters summary */}
              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2 flex-wrap text-sm text-gray-600">
                  <span>Active filters:</span>
                  {searchQuery.trim() && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                      Search: "{searchQuery}" ✕
                    </Badge>
                  )}
                  {classFilter !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setClassFilter('all')}>
                      Class: {classFilter} ✕
                    </Badge>
                  )}
                  {periodFilter !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setPeriodFilter('all')}>
                      Period: {periodFilter} ✕
                    </Badge>
                  )}
                  {examTitleFilter !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setExamTitleFilter('all')}>
                      Exam: {examTitleFilter} ✕
                    </Badge>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="text-blue-600 h-auto p-0"
                    onClick={() => {
                      setClassFilter('all')
                      setPeriodFilter('all')
                      setExamTitleFilter('all')
                      setSearchQuery('')
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {(authLoading || resultsLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-48">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!authLoading && !resultsLoading && !error && gradingResults.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ClipboardList className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No reports yet
              </h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Start grading your first exam! Upload a mark scheme and student exam to get AI-powered grading.
              </p>
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/grade-exam">
                  <Plus className="h-5 w-5 mr-2" />
                  Grade Your First Exam
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Grading Results Grid */}
        {!authLoading && !resultsLoading && !error && gradingResults.length > 0 && (
          <div>
            {/* Results header with select all */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredAndSortedResults.length} of {gradingResults.length} {gradingResults.length === 1 ? 'report' : 'reports'}
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({selectedIds.size} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={`text-gray-600 ${privacyMode ? 'bg-gray-100' : ''}`}
                  title={privacyMode ? 'Show scores' : 'Hide scores'}
                >
                  {privacyMode ? (
                    <EyeOff className="h-4 w-4 mr-1.5" />
                  ) : (
                    <Eye className="h-4 w-4 mr-1.5" />
                  )}
                  {privacyMode ? 'Privacy On' : 'Privacy Off'}
                </Button>
                {filteredAndSortedResults.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-gray-600"
                  >
                    {selectedIds.size === filteredAndSortedResults.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            </div>

            {filteredAndSortedResults.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Filter className="h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No reports match your filters
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your filters to see more results
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setClassFilter('all')
                      setPeriodFilter('all')
                      setExamTitleFilter('all')
                      setSearchQuery('')
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedResults.map((result) => {
                  const displayName = getDisplayName(result)
                  const filenameTitle = getFilenameTitle(result)
                  const isSelected = selectedIds.has(result.id)
                  const isDeleting = deletingIds.has(result.id)

                  return (
                    <Card
                      key={result.id}
                      className={`h-full hover:shadow-xl transition-all cursor-pointer border-2 group relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200'
                          : 'hover:border-blue-300'
                      } ${isDeleting ? 'opacity-50' : ''}`}
                      onClick={() => {
                        // Click opens the report
                        router.push(`/grade-report/${result.id}`)
                      }}
                    >
                      {/* Selection checkbox - click this area to toggle selection */}
                      <div
                        className={`absolute top-2 right-2 w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer z-10 ${
                          isSelected
                            ? 'bg-blue-100'
                            : 'bg-transparent hover:bg-gray-100'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelection(result.id)
                        }}
                      >
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500 shadow-md'
                              : 'bg-white border-gray-300 shadow-sm group-hover:border-gray-400'
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </div>
                      </div>

                      <CardHeader className="pb-2 pr-12">
                        <CardTitle className="text-lg line-clamp-2 leading-tight">
                          {filenameTitle}
                        </CardTitle>
                        <CardDescription className="space-y-2 mt-2">
                          {/* Student name */}
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium">{displayName}</span>
                          </div>
                          {/* Metadata badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {result.exam_title && (
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {result.exam_title}
                              </Badge>
                            )}
                            {result.class_name && (
                              <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                                {result.class_name}
                              </Badge>
                            )}
                            {result.class_period && (
                              <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Period {result.class_period}
                              </Badge>
                            )}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(result.created_at)}
                          </div>
                          {privacyMode ? (
                            <span className="font-medium text-gray-400 italic">
                              Hidden
                            </span>
                          ) : (
                            <span className="font-medium text-blue-600">
                              {result.total_marks}/{result.total_possible_marks} marks · {result.percentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Hint text */}
            {filteredAndSortedResults.length > 0 && (
              <p className="text-center text-sm text-gray-500 mt-6">
                Click a report to open it. Use the checkbox to select multiple.
              </p>
            )}
          </div>
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

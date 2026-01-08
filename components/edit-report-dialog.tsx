"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AutocompleteInput } from '@/components/autocomplete-input'
import { Loader2, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GradingResult {
  id: string
  student_name: string
  student_first_name: string | null
  student_last_name: string | null
  class_name: string | null
  class_period: string | null
  exam_title: string | null
}

interface EditReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedReports: GradingResult[]
  onSave: (updatedReports: GradingResult[]) => void
  userId: string | null
}

export function EditReportDialog({
  open,
  onOpenChange,
  selectedReports,
  onSave,
  userId
}: EditReportDialogProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state - for single edit
  const [studentFirstName, setStudentFirstName] = useState('')
  const [studentLastName, setStudentLastName] = useState('')

  // Form state - shared fields (single and bulk)
  const [className, setClassName] = useState('')
  const [classPeriod, setClassPeriod] = useState('')
  const [examTitle, setExamTitle] = useState('')

  const isBulkEdit = selectedReports.length > 1
  const singleReport = selectedReports.length === 1 ? selectedReports[0] : null

  // Reset form when dialog opens or selection changes
  useEffect(() => {
    if (open) {
      setError(null)
      if (singleReport) {
        // Pre-populate with current values for single edit
        setStudentFirstName(singleReport.student_first_name || '')
        setStudentLastName(singleReport.student_last_name || '')
        setClassName(singleReport.class_name || '')
        setClassPeriod(singleReport.class_period || '')
        setExamTitle(singleReport.exam_title || '')
      } else {
        // Clear form for bulk edit
        setStudentFirstName('')
        setStudentLastName('')
        setClassName('')
        setClassPeriod('')
        setExamTitle('')
      }
    }
  }, [open, singleReport])

  const handleSave = async () => {
    if (!userId) {
      setError('You must be logged in to edit reports')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (isBulkEdit) {
        // Bulk update
        const response = await fetch('/api/grading-results/bulk', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ids: selectedReports.map(r => r.id),
            className: className || undefined,
            classPeriod: classPeriod || undefined,
            examTitle: examTitle || undefined
          })
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to update reports')
        }

        // Update local state for all selected reports
        const updatedReports = selectedReports.map(report => ({
          ...report,
          class_name: className || report.class_name,
          class_period: classPeriod || report.class_period,
          exam_title: examTitle || report.exam_title
        }))

        onSave(updatedReports)
        toast({
          title: 'Reports updated',
          description: `${result.updatedCount} report${result.updatedCount === 1 ? '' : 's'} updated successfully`
        })
        onOpenChange(false)

      } else if (singleReport) {
        // Single update
        const response = await fetch(`/api/grading-results/${singleReport.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            studentFirstName,
            studentLastName,
            className,
            classPeriod,
            examTitle
          })
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to update report')
        }

        // Update local state
        const updatedReport: GradingResult = {
          ...singleReport,
          student_name: result.data.studentName,
          student_first_name: result.data.studentFirstName,
          student_last_name: result.data.studentLastName,
          class_name: result.data.className,
          class_period: result.data.classPeriod,
          exam_title: result.data.examTitle
        }

        onSave([updatedReport])
        toast({
          title: 'Report updated',
          description: 'Report details saved successfully'
        })
        onOpenChange(false)
      }

    } catch (err) {
      console.error('Error saving report:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {isBulkEdit ? `Edit ${selectedReports.length} Reports` : 'Edit Report Details'}
          </DialogTitle>
          <DialogDescription>
            {isBulkEdit
              ? 'Update shared fields across all selected reports. Only fields with values will be updated.'
              : 'Update the metadata for this grading report.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Single edit only: Student name fields */}
          {!isBulkEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="studentFirstName">Student First Name</Label>
                <AutocompleteInput
                  id="studentFirstName"
                  value={studentFirstName}
                  onChange={setStudentFirstName}
                  placeholder="Enter first name"
                  fieldName="studentFirstName"
                  userId={userId}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentLastName">Student Last Name</Label>
                <AutocompleteInput
                  id="studentLastName"
                  value={studentLastName}
                  onChange={setStudentLastName}
                  placeholder="Enter last name"
                  fieldName="studentLastName"
                  userId={userId}
                  disabled={isSaving}
                />
              </div>
            </>
          )}

          {/* Shared fields: Class, Period, Exam Title */}
          <div className="space-y-2">
            <Label htmlFor="className">Class Name</Label>
            <AutocompleteInput
              id="className"
              value={className}
              onChange={setClassName}
              placeholder={isBulkEdit ? "Leave empty to keep existing" : "Enter class name"}
              fieldName="className"
              userId={userId}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="classPeriod">Period</Label>
            <AutocompleteInput
              id="classPeriod"
              value={classPeriod}
              onChange={setClassPeriod}
              placeholder={isBulkEdit ? "Leave empty to keep existing" : "Enter period"}
              fieldName="classPeriod"
              userId={userId}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="examTitle">Exam Title</Label>
            <AutocompleteInput
              id="examTitle"
              value={examTitle}
              onChange={setExamTitle}
              placeholder={isBulkEdit ? "Leave empty to keep existing" : "Enter exam title"}
              fieldName="examTitle"
              userId={userId}
              disabled={isSaving}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isBulkEdit ? `Update ${selectedReports.length} Reports` : 'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

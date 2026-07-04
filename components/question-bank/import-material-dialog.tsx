"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { FileText, Loader2, Upload, X } from "lucide-react"

interface UploadedFile {
  url: string
  name: string
  type: string
}

// Build a question bank from the teacher's own content: PowerPoints, notes,
// worksheets, past tests. The AI identifies concepts and both extracts
// existing questions AND writes new ones covering the material — so a lecture
// deck with zero questions still produces a reviewable bank.
export default function ImportMaterialDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}) {
  const { toast } = useToast()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(fileList).slice(0, 5 - files.length)) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("folder", "casanovastudy/question-bank-imports")
        const res = await fetch("/api/upload-to-cloudinary", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok || !json.url) {
          toast({ title: json.error ?? `Failed to upload ${file.name}`, variant: "destructive" })
          continue
        }
        setFiles(prev => [...prev, { url: json.url, name: file.name, type: file.type }])
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleExtract = async () => {
    setExtracting(true)
    try {
      const res = await fetch("/api/question-bank/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_urls: files }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Extraction failed", variant: "destructive" })
        return
      }
      const conceptNote = json.created_concepts?.length
        ? ` New concepts created: ${json.created_concepts.map((c: { name: string }) => c.name).join(", ")}.`
        : ""
      toast({
        title: `${json.total_created} questions created — review them per concept`,
        description: `Everything is queued as suggestions until you approve.${conceptNote}`,
      })
      setFiles([])
      onOpenChange(false)
      onImported()
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setExtracting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !extracting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create questions from your content</DialogTitle>
          <DialogDescription>
            Upload PowerPoints, notes, worksheets, or past tests (PPTX, PDF, DOCX, or photos).
            The AI identifies the concepts your material covers and writes quiz questions for
            them — everything queues for your review before students see it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2 bg-muted/30">
              <span className="text-sm truncate flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                {f.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                disabled={extracting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {files.length < 5 && (
            <div>
              <input
                id="import-material-file"
                type="file"
                multiple
                accept=".pdf,.pptx,.docx,.txt,image/*,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={e => handleUpload(e.target.files)}
                disabled={uploading || extracting}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("import-material-file")?.click()}
                disabled={uploading || extracting}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploading ? "Uploading…" : files.length === 0 ? "Upload PowerPoint, PDF, or photos" : "Add another file"}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={extracting}>
            Cancel
          </Button>
          <Button onClick={handleExtract} disabled={files.length === 0 || uploading || extracting}>
            {extracting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {extracting ? "Creating questions… (can take a minute)" : "Create questions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

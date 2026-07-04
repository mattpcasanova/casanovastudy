"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ConceptRecord } from "@/lib/types/question-bank"

interface ConceptFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  concept?: ConceptRecord
  onSaved?: (concept: ConceptRecord) => void
}

export default function ConceptFormDialog({
  open,
  onOpenChange,
  mode,
  concept,
  onSaved,
}: ConceptFormDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [unit, setUnit] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(concept?.name ?? "")
      setUnit(concept?.unit ?? "")
      setDescription(concept?.description ?? "")
    }
  }, [open, concept])

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Concept name is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const url = mode === "create" ? "/api/concepts" : `/api/concepts/${concept!.id}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, unit, description }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to save concept", variant: "destructive" })
        return
      }
      onOpenChange(false)
      onSaved?.(json.concept)
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New concept" : "Edit concept"}</DialogTitle>
          <DialogDescription>
            A concept is a topic students master — keep it focused, like &quot;Sampling
            Distributions&quot; rather than &quot;Unit 4&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="concept-name">Name</Label>
            <Input
              id="concept-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Stoichiometry: mole-to-mole conversions"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concept-unit">Unit <span className="text-muted-foreground font-normal">(optional, groups concepts)</span></Label>
            <Input
              id="concept-unit"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g. Unit 4: Chemical Reactions"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concept-description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="concept-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What should students be able to do? Helps the AI suggest better questions."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Create concept" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

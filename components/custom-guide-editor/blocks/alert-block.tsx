"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EditorBlock, AlertBlockData } from "@/lib/types/editor-blocks"
import { Info, AlertTriangle, CheckCircle, GraduationCap } from "lucide-react"

interface AlertBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const variants = [
  { value: 'info', label: 'Info', icon: Info, color: 'text-blue-600' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-600' },
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-green-600' },
  { value: 'exam-tip', label: 'Exam Tip', icon: GraduationCap, color: 'text-purple-600' },
]

export function AlertBlock({ block, onUpdate }: AlertBlockProps) {
  const data = block.data as AlertBlockData

  const handleChange = (updates: Partial<AlertBlockData>) => {
    onUpdate({
      data: { ...data, ...updates }
    })
  }

  const selectedVariant = variants.find(v => v.value === data.variant)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="alert-variant">Type</Label>
          <Select
            value={data.variant}
            onValueChange={(value: AlertBlockData['variant']) => handleChange({ variant: value })}
          >
            <SelectTrigger id="alert-variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variants.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="alert-title">Title (optional)</Label>
          <Input
            id="alert-title"
            placeholder="Alert title..."
            value={data.title || ''}
            onChange={(e) => handleChange({ title: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="alert-message">Message</Label>
        <Textarea
          id="alert-message"
          placeholder="Enter alert message..."
          value={data.message}
          onChange={(e) => handleChange({ message: e.target.value })}
          className="min-h-[80px] resize-y"
        />
      </div>

      {/* Preview */}
      {data.message && (
        <div className={`p-3 rounded-lg border ${
          data.variant === 'info' ? 'bg-blue-50 border-blue-200' :
          data.variant === 'warning' ? 'bg-amber-50 border-amber-200' :
          data.variant === 'success' ? 'bg-green-50 border-green-200' :
          'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-start gap-2">
            {selectedVariant && <selectedVariant.icon className={`h-5 w-5 mt-0.5 ${selectedVariant.color}`} />}
            <div>
              {data.title && (
                <p className="font-semibold text-sm">{data.title}</p>
              )}
              <p className="text-sm">{data.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

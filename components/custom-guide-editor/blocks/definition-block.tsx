"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EditorBlock, DefinitionBlockData, DefinitionColorVariant } from "@/lib/types/editor-blocks"
import { Plus, Trash2 } from "lucide-react"

interface DefinitionBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const colorVariants: { value: DefinitionColorVariant; label: string; preview: string; bg: string; border: string; text: string; textLight: string }[] = [
  { value: 'purple', label: 'Purple', preview: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', textLight: 'text-purple-700' },
  { value: 'blue', label: 'Blue', preview: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', textLight: 'text-blue-700' },
  { value: 'teal', label: 'Teal', preview: 'bg-teal-500', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', textLight: 'text-teal-700' },
  { value: 'green', label: 'Green', preview: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', textLight: 'text-green-700' },
  { value: 'pink', label: 'Pink', preview: 'bg-pink-500', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', textLight: 'text-pink-700' },
  { value: 'orange', label: 'Orange', preview: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', textLight: 'text-orange-700' },
]

export function DefinitionBlock({ block, onUpdate }: DefinitionBlockProps) {
  const data = block.data as DefinitionBlockData
  const selectedVariant = colorVariants.find(v => v.value === (data.colorVariant || 'purple')) || colorVariants[0]

  const handleChange = (updates: Partial<DefinitionBlockData>) => {
    onUpdate({
      data: { ...data, ...updates }
    })
  }

  const updateExample = (index: number, value: string) => {
    const newExamples = [...(data.examples || [])]
    newExamples[index] = value
    handleChange({ examples: newExamples })
  }

  const addExample = () => {
    handleChange({ examples: [...(data.examples || []), ''] })
  }

  const removeExample = (index: number) => {
    handleChange({ examples: data.examples?.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="definition-term">Term</Label>
          <Input
            id="definition-term"
            value={data.term}
            onChange={(e) => handleChange({ term: e.target.value })}
            placeholder="Enter term..."
            className="font-semibold"
          />
        </div>
        <div>
          <Label htmlFor="definition-color">Color</Label>
          <Select
            value={data.colorVariant || 'purple'}
            onValueChange={(value: DefinitionColorVariant) => handleChange({ colorVariant: value })}
          >
            <SelectTrigger id="definition-color">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorVariants.map(({ value, label, preview }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${preview}`} />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="definition-text">Definition</Label>
        <Textarea
          id="definition-text"
          value={data.definition}
          onChange={(e) => handleChange({ definition: e.target.value })}
          placeholder="Enter definition..."
          className="min-h-[80px] resize-y"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Examples (optional)</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addExample}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Example
          </Button>
        </div>

        {data.examples && data.examples.length > 0 && (
          <div className="space-y-2">
            {data.examples.map((example, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">-</span>
                <Input
                  value={example}
                  onChange={(e) => updateExample(index, e.target.value)}
                  placeholder={`Example ${index + 1}...`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeExample(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {(data.term || data.definition) && (
        <div className={`${selectedVariant.bg} border ${selectedVariant.border} rounded-lg p-3 mt-3`}>
          <p className={`font-bold ${selectedVariant.text}`}>{data.term || 'Term'}</p>
          <p className={`${selectedVariant.text} mt-1`}>{data.definition || 'Definition'}</p>
          {data.examples && data.examples.filter(e => e.trim()).length > 0 && (
            <div className={`mt-2 pt-2 border-t ${selectedVariant.border}`}>
              <p className={`text-xs font-medium ${selectedVariant.textLight} mb-1`}>Examples:</p>
              <ul className={`text-sm ${selectedVariant.textLight} list-disc list-inside`}>
                {data.examples.filter(e => e.trim()).map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

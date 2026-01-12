"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { EditorBlock, DefinitionBlockData } from "@/lib/types/editor-blocks"
import { Plus, Trash2 } from "lucide-react"

interface DefinitionBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

export function DefinitionBlock({ block, onUpdate }: DefinitionBlockProps) {
  const data = block.data as DefinitionBlockData

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
                <span className="text-muted-foreground text-sm">•</span>
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
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-3">
          <p className="font-bold text-indigo-900">{data.term || 'Term'}</p>
          <p className="text-indigo-800 mt-1">{data.definition || 'Definition'}</p>
          {data.examples && data.examples.filter(e => e.trim()).length > 0 && (
            <div className="mt-2 pt-2 border-t border-indigo-200">
              <p className="text-xs font-medium text-indigo-700 mb-1">Examples:</p>
              <ul className="text-sm text-indigo-700 list-disc list-inside">
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

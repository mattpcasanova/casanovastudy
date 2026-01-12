"use client"

import { Textarea } from "@/components/ui/textarea"
import { EditorBlock, TextBlockData } from "@/lib/types/editor-blocks"

interface TextBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

export function TextBlock({ block, onUpdate }: TextBlockProps) {
  const data = block.data as TextBlockData

  const handleChange = (markdown: string) => {
    onUpdate({
      data: { ...data, markdown }
    })
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Enter text content (markdown supported)..."
        value={data.markdown}
        onChange={(e) => handleChange(e.target.value)}
        className="min-h-[100px] resize-y font-mono text-sm"
      />
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Markdown formatting:</p>
        <ul className="space-y-0.5 ml-2">
          <li><code className="bg-muted px-1 rounded">**bold**</code> or <code className="bg-muted px-1 rounded">*italic*</code> for text styling</li>
          <li><code className="bg-muted px-1 rounded">[link text](https://url.com)</code> for links</li>
          <li><code className="bg-muted px-1 rounded">- item</code> for bullet lists</li>
          <li><code className="bg-muted px-1 rounded">1. item</code> for numbered lists</li>
          <li><code className="bg-muted px-1 rounded">## Heading</code> for headings</li>
        </ul>
      </div>
    </div>
  )
}

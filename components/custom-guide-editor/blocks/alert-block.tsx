"use client"

import { cn } from "@/lib/utils"
import { EditorBlock, AlertBlockData } from "@/lib/types/editor-blocks"
import { ALERT_VARIANTS } from "../block-styles"
import { AutoTextarea, Segmented } from "../editor-ui"

interface AlertBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const variantOptions = (Object.keys(ALERT_VARIANTS) as AlertBlockData["variant"][]).map(v => ({
  value: v,
  label: ALERT_VARIANTS[v].label,
  icon: ALERT_VARIANTS[v].icon,
}))

export function AlertBlock({ block, onUpdate }: AlertBlockProps) {
  const data = block.data as AlertBlockData
  const v = ALERT_VARIANTS[data.variant] ?? ALERT_VARIANTS.info
  const Icon = v.icon

  const handleChange = (updates: Partial<AlertBlockData>) => {
    onUpdate({ data: { ...data, ...updates } })
  }

  return (
    <div className="space-y-2">
      <Segmented value={data.variant} options={variantOptions} onChange={(variant) => handleChange({ variant })} />
      <div className={cn("flex gap-3 rounded-xl border p-3 transition-colors duration-200", v.box)}>
        <Icon className={cn("mt-1.5 h-5 w-5 shrink-0", v.iconCls)} />
        <div className="min-w-0 flex-1">
          <input
            value={data.title || ""}
            onChange={(e) => handleChange({ title: e.target.value })}
            placeholder="Title (optional)"
            className={cn("w-full rounded-md bg-transparent px-2 py-1 font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 focus:bg-white/70", v.title)}
          />
          <AutoTextarea
            value={data.message}
            onChange={(e) => handleChange({ message: e.target.value })}
            placeholder="Write the callout…"
            minRows={2}
            className="hover:bg-white/50 focus:bg-white/80"
          />
        </div>
      </div>
    </div>
  )
}

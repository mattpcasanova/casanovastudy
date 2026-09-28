"use client"

import { cn } from "@/lib/utils"
import { EditorBlock, TableBlockData } from "@/lib/types/editor-blocks"
import { Plus, X } from "lucide-react"
import { ColorDots } from "../editor-ui"
import { TABLE_HEADER_STYLES } from "../block-styles"

interface TableBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

type HeaderStyle = NonNullable<TableBlockData["headerStyle"]>

const styleOptions = (Object.keys(TABLE_HEADER_STYLES) as HeaderStyle[]).map(value => ({
  value,
  label: TABLE_HEADER_STYLES[value].label,
  swatch: TABLE_HEADER_STYLES[value].swatch,
}))

const cellInput =
  "w-full min-w-[7rem] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:bg-blue-50/60"

// Edited in place as the real table (the old block was a grid of bordered
// form inputs that looked nothing like the result).
export function TableBlock({ block, onUpdate }: TableBlockProps) {
  const data = block.data as TableBlockData
  const style = TABLE_HEADER_STYLES[data.headerStyle || "default"] ?? TABLE_HEADER_STYLES.default

  const handleChange = (updates: Partial<TableBlockData>) => {
    onUpdate({ data: { ...data, ...updates } })
  }

  const updateHeader = (index: number, value: string) => {
    handleChange({ headers: data.headers.map((h, i) => (i === index ? value : h)) })
  }

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    handleChange({
      rows: data.rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row)),
    })
  }

  const addColumn = () => {
    handleChange({
      headers: [...data.headers, `Column ${data.headers.length + 1}`],
      rows: data.rows.map(row => [...row, ""]),
    })
  }

  const removeColumn = (index: number) => {
    if (data.headers.length <= 1) return
    handleChange({
      headers: data.headers.filter((_, i) => i !== index),
      rows: data.rows.map(row => row.filter((_, i) => i !== index)),
    })
  }

  const addRow = () => handleChange({ rows: [...data.rows, new Array(data.headers.length).fill("")] })

  const removeRow = (index: number) => {
    if (data.rows.length <= 1) return
    handleChange({ rows: data.rows.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <ColorDots value={data.headerStyle || "default"} options={styleOptions} onChange={(headerStyle) => handleChange({ headerStyle })} />
        <div className="flex gap-1">
          <button type="button" onClick={addColumn} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <Plus className="h-3.5 w-3.5" /> Column
          </button>
          <button type="button" onClick={addRow} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <Plus className="h-3.5 w-3.5" /> Row
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className={style.head}>
            <tr>
              {data.headers.map((header, colIndex) => (
                <th key={colIndex} className="group/col relative border-b border-slate-200 p-0 text-left">
                  <input
                    value={header}
                    onChange={(e) => updateHeader(colIndex, e.target.value)}
                    placeholder={`Column ${colIndex + 1}`}
                    className={cn(cellInput, "font-semibold", style.headText)}
                  />
                  {data.headers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColumn(colIndex)}
                      aria-label="Delete column"
                      className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover/col:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </th>
              ))}
              <th className="w-8 border-b border-slate-200" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group/row border-b border-slate-100 last:border-0 even:bg-slate-50/60">
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-0 align-top">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      placeholder="…"
                      className={cn(cellInput, "text-slate-700", colIndex === 0 && "font-medium text-slate-900")}
                    />
                  </td>
                ))}
                <td className="w-8 p-0 text-center">
                  {data.rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      aria-label="Delete row"
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 md:opacity-0 md:group-hover/row:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

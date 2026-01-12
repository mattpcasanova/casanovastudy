"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EditorBlock, TableBlockData } from "@/lib/types/editor-blocks"
import { Plus, Trash2 } from "lucide-react"

interface TableBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const headerStyles = [
  { value: 'default', label: 'Default (Gray)' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
]

export function TableBlock({ block, onUpdate }: TableBlockProps) {
  const data = block.data as TableBlockData

  const handleChange = (updates: Partial<TableBlockData>) => {
    onUpdate({
      data: { ...data, ...updates }
    })
  }

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...data.headers]
    newHeaders[index] = value
    handleChange({ headers: newHeaders })
  }

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = data.rows.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
        : row
    )
    handleChange({ rows: newRows })
  }

  const addColumn = () => {
    const newHeaders = [...data.headers, `Column ${data.headers.length + 1}`]
    const newRows = data.rows.map(row => [...row, ''])
    handleChange({ headers: newHeaders, rows: newRows })
  }

  const removeColumn = (index: number) => {
    if (data.headers.length <= 1) return
    const newHeaders = data.headers.filter((_, i) => i !== index)
    const newRows = data.rows.map(row => row.filter((_, i) => i !== index))
    handleChange({ headers: newHeaders, rows: newRows })
  }

  const addRow = () => {
    const newRow = new Array(data.headers.length).fill('')
    handleChange({ rows: [...data.rows, newRow] })
  }

  const removeRow = (index: number) => {
    if (data.rows.length <= 1) return
    handleChange({ rows: data.rows.filter((_, i) => i !== index) })
  }

  const headerStyleClass = {
    default: 'bg-gray-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
  }[data.headerStyle || 'default']

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label htmlFor="table-style">Header Style</Label>
          <Select
            value={data.headerStyle || 'default'}
            onValueChange={(value: TableBlockData['headerStyle']) => handleChange({ headerStyle: value })}
          >
            <SelectTrigger id="table-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {headerStyles.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pt-5">
          <Button variant="outline" size="sm" onClick={addColumn}>
            <Plus className="h-4 w-4 mr-1" />
            Column
          </Button>
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Row
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className={headerStyleClass}>
              {data.headers.map((header, colIndex) => (
                <th key={colIndex} className="border border-gray-300 p-1">
                  <div className="flex items-center gap-1">
                    <Input
                      value={header}
                      onChange={(e) => updateHeader(colIndex, e.target.value)}
                      className="h-7 text-sm font-semibold text-center"
                      placeholder={`Column ${colIndex + 1}`}
                    />
                    {data.headers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeColumn(colIndex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10 border border-gray-300"></th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-1">
                    <Input
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="h-7 text-sm"
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="border border-gray-300 p-1">
                  {data.rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removeRow(rowIndex)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

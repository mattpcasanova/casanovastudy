"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { BlockType } from "@/lib/types/editor-blocks"
import {
  Type,
  FolderOpen,
  AlertCircle,
  Table2,
  HelpCircle,
  CheckSquare,
  BookOpen,
  CreditCard,
  List,
  ScrollText,
  Search,
  Puzzle,
} from "lucide-react"

export type PresetKind = "outline" | "summary"

export type InsertChoice =
  | { kind: "block"; type: BlockType }
  | { kind: "preset"; preset: PresetKind }

export interface CatalogItem {
  key: string
  choice: InsertChoice
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  // Icon tile colors (full literal class strings for Tailwind's scanner)
  tile: string
  group: "Study formats" | "Building blocks"
  keywords: string
}

// The study-guide formats come first (Outline & Summary are presets over
// section/text; Quiz, Flashcards & Practice are real block types), then the building blocks.
export const BLOCK_CATALOG: CatalogItem[] = [
  { key: "outline", choice: { kind: "preset", preset: "outline" }, label: "Outline", description: "Nested topics you can collapse", icon: List, tile: "bg-blue-50 text-blue-600 ring-blue-100", group: "Study formats", keywords: "outline hierarchy topics" },
  { key: "summary", choice: { kind: "preset", preset: "summary" }, label: "Summary", description: "A section of clean prose", icon: ScrollText, tile: "bg-green-50 text-green-600 ring-green-100", group: "Study formats", keywords: "summary prose notes" },
  { key: "flashcards", choice: { kind: "block", type: "flashcards" }, label: "Flashcards", description: "A deck of flip cards", icon: CreditCard, tile: "bg-indigo-50 text-indigo-600 ring-indigo-100", group: "Study formats", keywords: "flashcards cards deck terms" },
  { key: "quiz", choice: { kind: "block", type: "quiz" }, label: "Quiz", description: "Practice questions with answers", icon: HelpCircle, tile: "bg-purple-50 text-purple-600 ring-purple-100", group: "Study formats", keywords: "quiz questions test" },
  { key: "practice", choice: { kind: "block", type: "practice" }, label: "Practice", description: "Match, fill in, order and sort", icon: Puzzle, tile: "bg-orange-50 text-orange-600 ring-orange-100", group: "Study formats", keywords: "practice interactive match matching fill blank order sort activity game" },
  { key: "text", choice: { kind: "block", type: "text" }, label: "Text", description: "Paragraphs and lists (markdown)", icon: Type, tile: "bg-slate-50 text-slate-600 ring-slate-200", group: "Building blocks", keywords: "text paragraph markdown" },
  { key: "section", choice: { kind: "block", type: "section" }, label: "Section", description: "Group blocks under a heading", icon: FolderOpen, tile: "bg-sky-50 text-sky-600 ring-sky-100", group: "Building blocks", keywords: "section heading group folder" },
  { key: "definition", choice: { kind: "block", type: "definition" }, label: "Definition", description: "Key term + meaning + examples", icon: BookOpen, tile: "bg-violet-50 text-violet-600 ring-violet-100", group: "Building blocks", keywords: "definition term vocab" },
  { key: "alert", choice: { kind: "block", type: "alert" }, label: "Callout", description: "Tip, warning, or exam note", icon: AlertCircle, tile: "bg-amber-50 text-amber-600 ring-amber-100", group: "Building blocks", keywords: "alert callout tip warning note exam" },
  { key: "table", choice: { kind: "block", type: "table" }, label: "Table", description: "Compare things side by side", icon: Table2, tile: "bg-emerald-50 text-emerald-600 ring-emerald-100", group: "Building blocks", keywords: "table compare grid chart" },
  { key: "checklist", choice: { kind: "block", type: "checklist" }, label: "Checklist", description: "Things to review or do", icon: CheckSquare, tile: "bg-teal-50 text-teal-600 ring-teal-100", group: "Building blocks", keywords: "checklist todo tasks" },
]

export function catalogFor(type: BlockType): CatalogItem {
  return BLOCK_CATALOG.find(i => i.choice.kind === "block" && i.choice.type === type) ?? BLOCK_CATALOG[4]
}

interface InsertMenuProps {
  trigger: React.ReactNode
  onChoose: (choice: InsertChoice) => void
  // Sections can't nest outline/summary presets or other sections.
  excludeContainers?: boolean
  align?: "start" | "center" | "end"
  side?: "top" | "bottom"
}

// Searchable, keyboard-navigable "insert block" popover (↑/↓ + Enter, or type
// to filter) — replaces the two-row button toolbar.
export function InsertMenu({ trigger, onChoose, excludeContainers, align = "start", side = "bottom" }: InsertMenuProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo(() => {
    const base = excludeContainers
      ? BLOCK_CATALOG.filter(i => i.choice.kind === "block" && i.choice.type !== "section")
      : BLOCK_CATALOG
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(i => i.label.toLowerCase().includes(q) || i.keywords.includes(q))
  }, [query, excludeContainers])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => { if (!open) setQuery("") }, [open])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [active])

  const choose = (item: CatalogItem) => {
    onChoose(item.choice)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive(a => Math.min(a + 1, items.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (items[active]) choose(items[active])
    }
  }

  let lastGroup: string | null = null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-72 p-0 overflow-hidden rounded-xl border-slate-200 shadow-xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No matching blocks</p>
          )}
          {items.map((item, index) => {
            const Icon = item.icon
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <div key={item.key}>
                {header && (
                  <p className="px-2 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {header}
                  </p>
                )}
                <button
                  type="button"
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
                    index === active ? "bg-slate-100" : "hover:bg-slate-50"
                  )}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset", item.tile)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                    <span className="block truncate text-xs text-slate-500">{item.description}</span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

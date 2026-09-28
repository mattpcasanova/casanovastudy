"use client"

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import {
  EditorBlock,
  EditorGuideMetadata,
  BlockType,
  createEmptyBlock,
  cloneBlockWithNewIds
} from '@/lib/types/editor-blocks'

interface EditorContextValue {
  // State
  blocks: EditorBlock[]
  selectedBlockId: string | null
  metadata: EditorGuideMetadata
  isDirty: boolean

  // Block actions — all stable (safe to pass to memoized children)
  addBlock: (type: BlockType, afterId?: string, parentId?: string) => void
  insertBlock: (block: EditorBlock, opts?: { afterId?: string | null; parentId?: string; atStart?: boolean }) => void
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void
  deleteBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  moveBlock: (id: string, direction: 'up' | 'down') => void
  reorderBlocks: (newBlocks: EditorBlock[]) => void
  selectBlock: (id: string | null) => void

  // Metadata actions
  setMetadata: (updates: Partial<EditorGuideMetadata>) => void

  // Initialization
  initializeBlocks: (blocks: EditorBlock[]) => void
  appendBlocks: (newBlocks: EditorBlock[], options?: { replaceMatching?: boolean }) => void // For AI streaming
  resetEditor: () => void
  markClean: () => void
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined)

const defaultMetadata: EditorGuideMetadata = {
  title: '',
  subject: 'general',
  gradeLevel: 'general'
}

// ── Immutable tree helpers ───────────────────────────────────────────────────
// Structural sharing: only the path from the root to the changed block gets new
// object identities. Untouched blocks keep their identity, so React.memo'd
// block components skip re-rendering while the user types in another block.
// (The previous implementation JSON-cloned the entire tree on every keystroke,
// which re-rendered every block and caused the editor's typing lag.)

function mapTree(
  blocks: EditorBlock[],
  id: string,
  fn: (block: EditorBlock) => EditorBlock
): EditorBlock[] {
  let changed = false
  const next = blocks.map(block => {
    if (block.id === id) {
      changed = true
      return fn(block)
    }
    if (block.children && block.children.length > 0) {
      const children = mapTree(block.children, id, fn)
      if (children !== block.children) {
        changed = true
        return { ...block, children }
      }
    }
    return block
  })
  return changed ? next : blocks
}

// Apply `fn` to the sibling array that contains `id` (root or a section's children).
function mapSiblings(
  blocks: EditorBlock[],
  id: string,
  fn: (siblings: EditorBlock[], index: number) => EditorBlock[]
): EditorBlock[] {
  const index = blocks.findIndex(b => b.id === id)
  if (index !== -1) return fn(blocks, index)

  let changed = false
  const next = blocks.map(block => {
    if (!block.children || block.children.length === 0) return block
    const children = mapSiblings(block.children, id, fn)
    if (children !== block.children) {
      changed = true
      return { ...block, children }
    }
    return block
  })
  return changed ? next : blocks
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [metadata, setMetadataState] = useState<EditorGuideMetadata>(defaultMetadata)
  const [isDirty, setIsDirty] = useState(false)

  const insertBlock = useCallback((
    newBlock: EditorBlock,
    opts: { afterId?: string | null; parentId?: string; atStart?: boolean } = {}
  ) => {
    const { afterId, parentId, atStart } = opts
    setBlocks(prev => {
      if (afterId) {
        return mapSiblings(prev, afterId, (siblings, i) => [
          ...siblings.slice(0, i + 1),
          newBlock,
          ...siblings.slice(i + 1),
        ])
      }
      if (parentId) {
        return mapTree(prev, parentId, parent => {
          const kids = parent.children ?? []
          return { ...parent, children: atStart ? [newBlock, ...kids] : [...kids, newBlock] }
        })
      }
      return atStart ? [newBlock, ...prev] : [...prev, newBlock]
    })
    setIsDirty(true)
    setSelectedBlockId(newBlock.id)
  }, [])

  const addBlock = useCallback((type: BlockType, afterId?: string, parentId?: string) => {
    insertBlock(createEmptyBlock(type), { afterId, parentId })
  }, [insertBlock])

  const updateBlock = useCallback((id: string, updates: Partial<EditorBlock>) => {
    setBlocks(prev => mapTree(prev, id, block => ({ ...block, ...updates })))
    setIsDirty(true)
  }, [])

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => mapSiblings(prev, id, (siblings, i) => [
      ...siblings.slice(0, i),
      ...siblings.slice(i + 1),
    ]))
    setIsDirty(true)
    setSelectedBlockId(current => (current === id ? null : current))
  }, [])

  const duplicateBlock = useCallback((id: string) => {
    let copyId: string | null = null
    setBlocks(prev => mapSiblings(prev, id, (siblings, i) => {
      const copy = cloneBlockWithNewIds(siblings[i])
      copyId = copy.id
      return [...siblings.slice(0, i + 1), copy, ...siblings.slice(i + 1)]
    }))
    setIsDirty(true)
    if (copyId) setSelectedBlockId(copyId)
  }, [])

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks(prev => mapSiblings(prev, id, (siblings, i) => {
      const target = direction === 'up' ? i - 1 : i + 1
      if (target < 0 || target >= siblings.length) return siblings
      const next = [...siblings]
      ;[next[i], next[target]] = [next[target], next[i]]
      return next
    }))
    setIsDirty(true)
  }, [])

  // Reorder blocks (for drag and drop / bulk transforms)
  const reorderBlocks = useCallback((newBlocks: EditorBlock[]) => {
    setBlocks(newBlocks)
    setIsDirty(true)
  }, [])

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id)
  }, [])

  const setMetadata = useCallback((updates: Partial<EditorGuideMetadata>) => {
    setMetadataState(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
  }, [])

  // Initialize blocks (for editing existing guides)
  const initializeBlocks = useCallback((newBlocks: EditorBlock[]) => {
    setBlocks(newBlocks)
    setSelectedBlockId(null)
    setIsDirty(false)
  }, [])

  // Append blocks (for AI streaming - uses functional update to avoid stale closures)
  const appendBlocks = useCallback((newBlocks: EditorBlock[], options?: { replaceMatching?: boolean }) => {
    setBlocks(prev => {
      if (!options?.replaceMatching) return [...prev, ...newBlocks]

      // Replace a matching quiz/checklist (the AI returns a merged version when
      // asked to e.g. "add 3 questions to the quiz"); otherwise append.
      const updated = [...prev]
      for (const newBlock of newBlocks) {
        const existingIndex = updated.findIndex(b =>
          (b.type === 'quiz' && newBlock.type === 'quiz') ||
          (b.type === 'checklist' && newBlock.type === 'checklist')
        )
        if (existingIndex !== -1) {
          updated[existingIndex] = newBlock
        } else {
          updated.push(newBlock)
        }
      }
      return updated
    })
    setIsDirty(true)
  }, [])

  const resetEditor = useCallback(() => {
    setBlocks([])
    setSelectedBlockId(null)
    setMetadataState(defaultMetadata)
    setIsDirty(false)
  }, [])

  const markClean = useCallback(() => {
    setIsDirty(false)
  }, [])

  const value = useMemo<EditorContextValue>(() => ({
    blocks,
    selectedBlockId,
    metadata,
    isDirty,
    addBlock,
    insertBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    moveBlock,
    reorderBlocks,
    selectBlock,
    setMetadata,
    initializeBlocks,
    appendBlocks,
    resetEditor,
    markClean
  }), [
    blocks, selectedBlockId, metadata, isDirty,
    addBlock, insertBlock, updateBlock, deleteBlock, duplicateBlock, moveBlock,
    reorderBlocks, selectBlock, setMetadata, initializeBlocks, appendBlocks, resetEditor, markClean
  ])

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}

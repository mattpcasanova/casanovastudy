"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  EditorBlock,
  EditorGuideMetadata,
  BlockType,
  createEmptyBlock,
  generateBlockId
} from '@/lib/types/editor-blocks'

interface EditorContextValue {
  // State
  blocks: EditorBlock[]
  selectedBlockId: string | null
  metadata: EditorGuideMetadata
  isDirty: boolean

  // Block actions
  addBlock: (type: BlockType, afterId?: string, parentId?: string) => void
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void
  deleteBlock: (id: string) => void
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
  subject: 'other',
  gradeLevel: '9th-10th'
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [metadata, setMetadataState] = useState<EditorGuideMetadata>(defaultMetadata)
  const [isDirty, setIsDirty] = useState(false)

  // Find a block by ID (recursive)
  const findBlock = useCallback((blocks: EditorBlock[], id: string): EditorBlock | null => {
    for (const block of blocks) {
      if (block.id === id) return block
      if (block.children) {
        const found = findBlock(block.children, id)
        if (found) return found
      }
    }
    return null
  }, [])

  // Find the parent array and index of a block
  const findBlockLocation = useCallback((
    blocks: EditorBlock[],
    id: string,
    parent: EditorBlock[] | null = null
  ): { array: EditorBlock[], index: number, parent: EditorBlock[] | null } | null => {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].id === id) {
        return { array: blocks, index: i, parent }
      }
      if (blocks[i].children) {
        const result = findBlockLocation(blocks[i].children!, id, blocks)
        if (result) return result
      }
    }
    return null
  }, [])

  // Add a new block
  const addBlock = useCallback((type: BlockType, afterId?: string, parentId?: string) => {
    const newBlock = createEmptyBlock(type)

    setBlocks(prev => {
      const newBlocks = JSON.parse(JSON.stringify(prev)) as EditorBlock[]

      // If parentId is specified, add as child of that block
      if (parentId) {
        const addToParent = (blocks: EditorBlock[]): boolean => {
          for (const block of blocks) {
            if (block.id === parentId) {
              if (!block.children) block.children = []
              block.children.push(newBlock)
              return true
            }
            if (block.children && addToParent(block.children)) return true
          }
          return false
        }
        addToParent(newBlocks)
        setIsDirty(true)
        return newBlocks
      }

      // If afterId is specified, add after that block
      if (afterId) {
        const insertAfter = (blocks: EditorBlock[]): boolean => {
          for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].id === afterId) {
              blocks.splice(i + 1, 0, newBlock)
              return true
            }
            if (blocks[i].children && insertAfter(blocks[i].children!)) return true
          }
          return false
        }
        insertAfter(newBlocks)
      } else {
        // Add to the end of root blocks
        newBlocks.push(newBlock)
      }

      setIsDirty(true)
      return newBlocks
    })

    setSelectedBlockId(newBlock.id)
  }, [])

  // Update a block
  const updateBlock = useCallback((id: string, updates: Partial<EditorBlock>) => {
    setBlocks(prev => {
      const newBlocks = JSON.parse(JSON.stringify(prev)) as EditorBlock[]

      const update = (blocks: EditorBlock[]): boolean => {
        for (let i = 0; i < blocks.length; i++) {
          if (blocks[i].id === id) {
            blocks[i] = { ...blocks[i], ...updates }
            return true
          }
          if (blocks[i].children && update(blocks[i].children!)) return true
        }
        return false
      }

      update(newBlocks)
      setIsDirty(true)
      return newBlocks
    })
  }, [])

  // Delete a block
  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const newBlocks = JSON.parse(JSON.stringify(prev)) as EditorBlock[]

      const remove = (blocks: EditorBlock[]): boolean => {
        for (let i = 0; i < blocks.length; i++) {
          if (blocks[i].id === id) {
            blocks.splice(i, 1)
            return true
          }
          if (blocks[i].children && remove(blocks[i].children!)) return true
        }
        return false
      }

      remove(newBlocks)
      setIsDirty(true)
      return newBlocks
    })

    // Clear selection if deleted block was selected
    if (selectedBlockId === id) {
      setSelectedBlockId(null)
    }
  }, [selectedBlockId])

  // Move a block up or down
  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const newBlocks = JSON.parse(JSON.stringify(prev)) as EditorBlock[]

      const move = (blocks: EditorBlock[]): boolean => {
        for (let i = 0; i < blocks.length; i++) {
          if (blocks[i].id === id) {
            const newIndex = direction === 'up' ? i - 1 : i + 1
            if (newIndex >= 0 && newIndex < blocks.length) {
              const [removed] = blocks.splice(i, 1)
              blocks.splice(newIndex, 0, removed)
              return true
            }
            return false
          }
          if (blocks[i].children && move(blocks[i].children!)) return true
        }
        return false
      }

      const moved = move(newBlocks)
      if (moved) {
        return newBlocks
      }
      return prev // Return original if no move happened
    })
    setIsDirty(true)
  }, [])

  // Reorder blocks (for drag and drop)
  const reorderBlocks = useCallback((newBlocks: EditorBlock[]) => {
    setBlocks(newBlocks)
    setIsDirty(true)
  }, [])

  // Select a block
  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id)
  }, [])

  // Update metadata
  const setMetadata = useCallback((updates: Partial<EditorGuideMetadata>) => {
    setMetadataState(prev => {
      setIsDirty(true)
      return { ...prev, ...updates }
    })
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
      if (options?.replaceMatching) {
        // Try to replace matching sections (same type for quiz/checklist)
        let updated = [...prev]
        for (const newBlock of newBlocks) {
          const existingIndex = updated.findIndex(b => {
            if (b.type === 'quiz' && newBlock.type === 'quiz') return true
            if (b.type === 'checklist' && newBlock.type === 'checklist') return true
            if (b.type === newBlock.type && b.title && newBlock.title &&
                b.title.toLowerCase() === newBlock.title.toLowerCase()) return true
            return false
          })

          if (existingIndex !== -1 && (newBlock.type === 'quiz' || newBlock.type === 'checklist')) {
            updated[existingIndex] = newBlock
            console.log(`📝 Replaced existing ${newBlock.type} with AI-generated merged version`)
          } else {
            updated.push(newBlock)
          }
        }
        return updated
      } else {
        // Simple append
        return [...prev, ...newBlocks]
      }
    })
    setIsDirty(true)
  }, [])

  // Reset the editor to default state
  const resetEditor = useCallback(() => {
    setBlocks([])
    setSelectedBlockId(null)
    setMetadataState(defaultMetadata)
    setIsDirty(false)
  }, [])

  // Mark the editor as clean (after saving)
  const markClean = useCallback(() => {
    setIsDirty(false)
  }, [])

  const value: EditorContextValue = {
    blocks,
    selectedBlockId,
    metadata,
    isDirty,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    reorderBlocks,
    selectBlock,
    setMetadata,
    initializeBlocks,
    appendBlocks,
    resetEditor,
    markClean
  }

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

// Deduplication utilities for study guide content
import { EditorBlock, DefinitionBlockData, ChecklistBlockData, QuizBlockData, TextBlockData } from './types/editor-blocks'

// Normalize text for comparison (lowercase, trim, remove extra spaces)
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Calculate similarity between two strings (simple Jaccard-like coefficient)
function textSimilarity(a: string, b: string): number {
  const normA = normalizeText(a)
  const normB = normalizeText(b)

  if (normA === normB) return 1.0
  if (!normA || !normB) return 0

  // Word-based comparison
  const wordsA = new Set(normA.split(' '))
  const wordsB = new Set(normB.split(' '))

  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])

  return intersection.size / union.size
}

// Check if two items are duplicates (similarity threshold)
function isDuplicate(a: string, b: string, threshold = 0.8): boolean {
  return textSimilarity(a, b) >= threshold
}

// Deduplicate checklist items within a block
function deduplicateChecklistItems(data: ChecklistBlockData): ChecklistBlockData {
  const seen = new Map<string, string>() // normalized label -> original id
  const uniqueItems = data.items.filter(item => {
    const normalized = normalizeText(item.label)
    if (!normalized) return false // Skip empty items

    // Check for exact or near-duplicate
    for (const [existingNorm] of seen) {
      if (isDuplicate(normalized, existingNorm, 0.85)) {
        console.log(`🔄 Removing duplicate checklist item: "${item.label}"`)
        return false
      }
    }

    seen.set(normalized, item.id)
    return true
  })

  return { ...data, items: uniqueItems }
}

// Deduplicate quiz questions within a block
function deduplicateQuizQuestions(data: QuizBlockData): QuizBlockData {
  const seen = new Map<string, string>() // normalized question -> original id
  const uniqueQuestions = data.questions.filter(q => {
    const normalized = normalizeText(q.question)
    if (!normalized) return false

    for (const [existingNorm] of seen) {
      if (isDuplicate(normalized, existingNorm, 0.75)) {
        console.log(`🔄 Removing duplicate quiz question: "${q.question.slice(0, 50)}..."`)
        return false
      }
    }

    seen.set(normalized, q.id)
    return true
  })

  return { ...data, questions: uniqueQuestions }
}

// Deduplicate a single block's internal content
function deduplicateBlockContent(block: EditorBlock): EditorBlock {
  const updated = { ...block }

  switch (block.type) {
    case 'checklist':
      updated.data = deduplicateChecklistItems(block.data as ChecklistBlockData)
      break
    case 'quiz':
      updated.data = deduplicateQuizQuestions(block.data as QuizBlockData)
      break
  }

  // Recursively deduplicate children
  if (block.children && block.children.length > 0) {
    updated.children = deduplicateBlocks(block.children)
  }

  return updated
}

// Check if two blocks are duplicates of each other
function areBlocksDuplicates(a: EditorBlock, b: EditorBlock): boolean {
  if (a.type !== b.type) return false

  switch (a.type) {
    case 'definition': {
      const defA = a.data as DefinitionBlockData
      const defB = b.data as DefinitionBlockData
      // Definitions are duplicates if terms are similar
      return isDuplicate(defA.term, defB.term, 0.9)
    }

    case 'text': {
      const textA = a.data as TextBlockData
      const textB = b.data as TextBlockData
      // Text blocks are duplicates if content is very similar
      return isDuplicate(textA.markdown, textB.markdown, 0.9)
    }

    case 'section': {
      // Sections are duplicates if titles are similar
      if (a.title && b.title) {
        return isDuplicate(a.title, b.title, 0.9)
      }
      return false
    }

    case 'checklist': {
      const checkA = a.data as ChecklistBlockData
      const checkB = b.data as ChecklistBlockData
      // Checklists are duplicates if they have very similar items
      if (checkA.items.length === 0 || checkB.items.length === 0) return false

      // Compare first few items
      const labelsA = checkA.items.slice(0, 3).map(i => normalizeText(i.label)).join(' ')
      const labelsB = checkB.items.slice(0, 3).map(i => normalizeText(i.label)).join(' ')
      return isDuplicate(labelsA, labelsB, 0.8)
    }

    case 'quiz': {
      const quizA = a.data as QuizBlockData
      const quizB = b.data as QuizBlockData
      // Quizzes are duplicates if they have very similar questions
      if (quizA.questions.length === 0 || quizB.questions.length === 0) return false

      const questionsA = quizA.questions.slice(0, 3).map(q => normalizeText(q.question)).join(' ')
      const questionsB = quizB.questions.slice(0, 3).map(q => normalizeText(q.question)).join(' ')
      return isDuplicate(questionsA, questionsB, 0.8)
    }

    default:
      return false
  }
}

// Main deduplication function - removes duplicate blocks and deduplicates internal content
export function deduplicateBlocks(blocks: EditorBlock[]): EditorBlock[] {
  const uniqueBlocks: EditorBlock[] = []

  for (const block of blocks) {
    // First, deduplicate the block's internal content
    const deduplicatedBlock = deduplicateBlockContent(block)

    // Then check if this block is a duplicate of an existing one
    let isDuplicateBlock = false
    for (const existing of uniqueBlocks) {
      if (areBlocksDuplicates(deduplicatedBlock, existing)) {
        console.log(`🔄 Removing duplicate ${block.type} block: "${block.title || (block.data as any)?.term || 'untitled'}"`)
        isDuplicateBlock = true

        // Special handling: merge quiz questions or checklist items instead of dropping entirely
        if (block.type === 'quiz' && existing.type === 'quiz') {
          const existingData = existing.data as QuizBlockData
          const newData = deduplicatedBlock.data as QuizBlockData

          // Add unique questions from new block to existing
          for (const q of newData.questions) {
            const hasQuestion = existingData.questions.some(eq =>
              isDuplicate(eq.question, q.question, 0.75)
            )
            if (!hasQuestion) {
              existingData.questions.push(q)
            }
          }
          existing.data = existingData
        } else if (block.type === 'checklist' && existing.type === 'checklist') {
          const existingData = existing.data as ChecklistBlockData
          const newData = deduplicatedBlock.data as ChecklistBlockData

          // Add unique items from new block to existing
          for (const item of newData.items) {
            const hasItem = existingData.items.some(ei =>
              isDuplicate(ei.label, item.label, 0.85)
            )
            if (!hasItem) {
              existingData.items.push(item)
            }
          }
          existing.data = existingData
        }

        break
      }
    }

    if (!isDuplicateBlock) {
      uniqueBlocks.push(deduplicatedBlock)
    }
  }

  return uniqueBlocks
}

// Count how many duplicates were found/removed
export function countDuplicates(blocks: EditorBlock[]): {
  totalDuplicates: number
  byType: Record<string, number>
} {
  const originalCount = countBlocks(blocks)
  const deduplicatedBlocks = deduplicateBlocks(blocks)
  const newCount = countBlocks(deduplicatedBlocks)

  return {
    totalDuplicates: originalCount.total - newCount.total,
    byType: {
      blocks: originalCount.blocks - newCount.blocks,
      checklistItems: originalCount.checklistItems - newCount.checklistItems,
      quizQuestions: originalCount.quizQuestions - newCount.quizQuestions,
    }
  }
}

function countBlocks(blocks: EditorBlock[]): {
  total: number
  blocks: number
  checklistItems: number
  quizQuestions: number
} {
  let blockCount = 0
  let checklistItems = 0
  let quizQuestions = 0

  function countRecursive(blocks: EditorBlock[]) {
    for (const block of blocks) {
      blockCount++

      if (block.type === 'checklist') {
        checklistItems += (block.data as ChecklistBlockData).items.length
      } else if (block.type === 'quiz') {
        quizQuestions += (block.data as QuizBlockData).questions.length
      }

      if (block.children) {
        countRecursive(block.children)
      }
    }
  }

  countRecursive(blocks)

  return {
    total: blockCount + checklistItems + quizQuestions,
    blocks: blockCount,
    checklistItems,
    quizQuestions
  }
}

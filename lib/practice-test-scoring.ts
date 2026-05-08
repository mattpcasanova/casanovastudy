import {
  AnswerKey,
  AnswerLetter,
  BIG_IDEAS,
  BigIdea,
  BigIdeaBreakdown,
  ResponseMap,
} from './types/practice-test'

export interface ScoredSubmission {
  scoreTotal: number
  scoreMax: number
  bigIdeaBreakdown: BigIdeaBreakdown
}

export function scoreSubmission(
  answerKey: AnswerKey,
  responses: ResponseMap
): ScoredSubmission {
  const breakdown: BigIdeaBreakdown = {}
  for (const bi of BIG_IDEAS) {
    breakdown[String(bi)] = { correct: 0, total: 0 }
  }

  let scoreTotal = 0
  let scoreMax = 0

  for (const [qNum, entry] of Object.entries(answerKey)) {
    if (!entry || !entry.answer || !entry.bigIdea) continue
    const biKey = String(entry.bigIdea)
    if (!breakdown[biKey]) breakdown[biKey] = { correct: 0, total: 0 }

    breakdown[biKey].total += 1
    scoreMax += 1

    const studentAnswer = responses[qNum]
    if (studentAnswer && studentAnswer === entry.answer) {
      breakdown[biKey].correct += 1
      scoreTotal += 1
    }
  }

  return { scoreTotal, scoreMax, bigIdeaBreakdown: breakdown }
}

export function isAnswerLetter(v: unknown): v is AnswerLetter {
  return v === 'A' || v === 'B' || v === 'C' || v === 'D'
}

export function isBigIdea(v: unknown): v is BigIdea {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === 6
}

export function sanitizeResponses(input: unknown): ResponseMap {
  if (!input || typeof input !== 'object') return {}
  const out: ResponseMap = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const qNum = Number(k)
    if (!Number.isInteger(qNum) || qNum < 1) continue
    if (!isAnswerLetter(v)) continue
    out[String(qNum)] = v
  }
  return out
}

export function aggregateBigIdeas(
  submissions: Array<{ big_idea_breakdown: BigIdeaBreakdown }>
): BigIdeaBreakdown {
  const agg: BigIdeaBreakdown = {}
  for (const bi of BIG_IDEAS) {
    agg[String(bi)] = { correct: 0, total: 0 }
  }
  for (const s of submissions) {
    for (const [biKey, entry] of Object.entries(s.big_idea_breakdown ?? {})) {
      if (!agg[biKey]) agg[biKey] = { correct: 0, total: 0 }
      agg[biKey].correct += entry?.correct ?? 0
      agg[biKey].total += entry?.total ?? 0
    }
  }
  return agg
}

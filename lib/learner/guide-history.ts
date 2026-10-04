// A student's history with one guide: which of its questions they got wrong
// the last time they answered them, and on which topics. Drives the "Last time
// you missed N here" nudge in the quiz and practice players. Pure and
// unit-tested; rows are the student's own study_results for this guide.

export interface HistoryRow {
  item_id: string | null
  topic: string | null
  correct: boolean
  answered_at: string
}

export interface GuideHistory {
  /** Item ids (without the `q:`/`p:` prefix) whose most recent answer was wrong. */
  missedIds: string[]
  /** Topics of those items, most-missed first. */
  topics: string[]
}

export function lastMissed(rows: HistoryRow[], prefix: 'q:' | 'p:'): GuideHistory {
  const latest = new Map<string, HistoryRow>()
  for (const r of rows) {
    if (!r.item_id?.startsWith(prefix)) continue
    const prev = latest.get(r.item_id)
    if (!prev || r.answered_at > prev.answered_at) latest.set(r.item_id, r)
  }
  const missed = [...latest.values()].filter((r) => !r.correct)
  const topicCount = new Map<string, number>()
  for (const r of missed) if (r.topic?.trim()) topicCount.set(r.topic.trim(), (topicCount.get(r.topic.trim()) ?? 0) + 1)
  return {
    missedIds: missed.map((r) => r.item_id!.slice(prefix.length)),
    topics: [...topicCount].sort((a, b) => b[1] - a[1]).map(([t]) => t),
  }
}

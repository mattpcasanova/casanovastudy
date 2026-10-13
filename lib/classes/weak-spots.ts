// A class's top weak spots: each linked student's learner profile
// (lib/learner/profile.ts), combined by topic. Pure; unit-tested.

import type { LearnerProfile } from '@/lib/learner/profile'

export interface ClassWeakSpot {
  key: string
  subject: string | null
  topic: string
  /** Students for whom this topic is weak. */
  students: number
  /** Average recent accuracy among those students (0-1). */
  accuracy: number
}

export function classWeakSpots(profiles: LearnerProfile[], limit = 8): ClassWeakSpot[] {
  const byKey = new Map<string, ClassWeakSpot & { total: number }>()
  for (const p of profiles) {
    for (const t of p.weak) {
      const spot = byKey.get(t.key) ?? { key: t.key, subject: t.subject, topic: t.topic, students: 0, accuracy: 0, total: 0 }
      spot.students += 1
      spot.total += t.recentAccuracy
      byKey.set(t.key, spot)
    }
  }
  return [...byKey.values()]
    .map(({ total, ...s }) => ({ ...s, accuracy: total / s.students }))
    .sort((a, b) => b.students - a.students || a.accuracy - b.accuracy)
    .slice(0, limit)
}

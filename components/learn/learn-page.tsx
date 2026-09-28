"use client"

import { useMemo } from 'react'
import type { StudyGuideRecord } from '@/lib/supabase'
import LearnMode from './learn-mode'
import { learnItemsFor } from './items'

// Client wrapper: item extraction uses client-side parsers.
export default function LearnPage({ guide }: { guide: Pick<StudyGuideRecord, 'id' | 'title' | 'format' | 'content' | 'custom_content'> }) {
  const items = useMemo(() => learnItemsFor(guide), [guide])
  return <LearnMode guideId={guide.id} title={guide.title} items={items} />
}

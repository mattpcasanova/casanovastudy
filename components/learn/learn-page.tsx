"use client"

import { useMemo } from 'react'
import type { StudyGuideRecord } from '@/lib/supabase'
import LearnMode from './learn-mode'
import { learnItemsFor } from './items'
import { DesmosProvider } from '@/components/desmos/desmos-calculator'
import { ExplainProvider } from '@/components/explain/explain-provider'
import { StudyResultsProvider } from '@/components/study-results-context'
import { calculatorFor } from '@/lib/formats/figures'

// Client wrapper: item extraction uses client-side parsers.
export default function LearnPage({ guide }: { guide: Pick<StudyGuideRecord, 'id' | 'title' | 'format' | 'content' | 'custom_content'> & Partial<Pick<StudyGuideRecord, 'subject' | 'topic_focus' | 'grade_level'>> }) {
  const items = useMemo(() => learnItemsFor(guide), [guide])
  const mode = calculatorFor({ subject: guide.subject, level: guide.grade_level, text: [guide.title, guide.topic_focus].filter(Boolean).join('\n') })
  return (
    <DesmosProvider guideId={guide.id} mode={mode} showButton={false}>
      <ExplainProvider guideId={guide.id}>
        <StudyResultsProvider guideId={guide.id} subject={guide.subject}>
          <LearnMode guideId={guide.id} title={guide.title} items={items} />
        </StudyResultsProvider>
      </ExplainProvider>
    </DesmosProvider>
  )
}

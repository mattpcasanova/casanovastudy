import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import StudyGuideViewer from '@/components/study-guide-viewer'
import { Metadata } from 'next'

interface StudyGuidePageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: StudyGuidePageProps): Promise<Metadata> {
  const { id } = await params

  const { data: studyGuide } = await supabase
    .from('study_guides')
    .select('title, subject')
    .eq('id', id)
    .single()

  if (!studyGuide) {
    return {
      title: 'Study Guide Not Found'
    }
  }

  return {
    title: `${studyGuide.title} - ${studyGuide.subject} | CasanovaStudy`,
    description: `Interactive study guide for ${studyGuide.subject}. Created with CasanovaStudy.`
  }
}

export default async function StudyGuidePage({ params }: StudyGuidePageProps) {
  const { id } = await params

  const { data: studyGuide, error } = await supabase
    .from('study_guides')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !studyGuide) {
    notFound()
  }

  return <StudyGuideViewer studyGuide={studyGuide} />
}

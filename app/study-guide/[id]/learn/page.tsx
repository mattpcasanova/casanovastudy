import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import NavigationHeader from '@/components/navigation-header'
import LearnPage from '@/components/learn/learn-page'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase.from('study_guides').select('title').eq('id', id).single()
  return { title: data ? `Learn: ${data.title} | CasanovaStudy` : 'Learn | CasanovaStudy' }
}

export default async function LearnRoute({ params }: Props) {
  const { id } = await params
  const { data: guide } = await supabase
    .from('study_guides')
    .select('id, title, format, content, custom_content, subject, topic_focus, grade_level')
    .eq('id', id)
    .single()
  if (!guide) notFound()

  return (
    <>
      <NavigationHeader />
      <LearnPage guide={guide} />
    </>
  )
}

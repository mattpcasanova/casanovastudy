import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import NavigationHeader from '@/components/navigation-header'
import GuideEditor from '@/components/guide-edit/guide-editor'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase.from('study_guides').select('title').eq('id', id).single()
  return { title: data ? `Edit: ${data.title} | CasanovaStudy` : 'Edit | CasanovaStudy' }
}

export default async function EditGuideRoute({ params }: Props) {
  const { id } = await params
  const { data: guide } = await supabase.from('study_guides').select('*').eq('id', id).single()
  if (!guide) notFound()

  return (
    <>
      <NavigationHeader />
      <GuideEditor guide={guide} />
    </>
  )
}

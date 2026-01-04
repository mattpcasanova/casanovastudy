import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with auth token for RLS
function createAuthenticatedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

interface FlashcardProgressRequest {
  studyGuideId: string
  cardId: string
  status: 'mastered' | 'difficult'
  userId?: string
}

interface ResetProgressRequest {
  studyGuideId: string
  userId?: string
}

// GET - Load flashcard progress for a study guide
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studyGuideId = searchParams.get('studyGuideId')

    if (!studyGuideId) {
      return NextResponse.json(
        { error: 'Study guide ID is required' },
        { status: 400 }
      )
    }

    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'You must be logged in to view progress' },
        { status: 401 }
      )
    }

    // Create Supabase client with the auth token
    const token = authHeader.replace('Bearer ', '')
    const supabase = createAuthenticatedClient(token)

    // Verify the auth token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Fetch all progress for this user and study guide
    const { data, error } = await supabase
      .from('flashcard_progress')
      .select('card_id, status')
      .eq('user_id', user.id)
      .eq('study_guide_id', studyGuideId)

    if (error) {
      console.error('Error fetching flashcard progress:', error)
      return NextResponse.json(
        { error: 'Failed to load progress' },
        { status: 500 }
      )
    }

    // Transform to object format: { card_id: status }
    const progress: Record<string, 'mastered' | 'difficult'> = {}
    data?.forEach(item => {
      progress[item.card_id] = item.status
    })

    return NextResponse.json({ progress })

  } catch (error) {
    console.error('Get flashcard progress error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save/update flashcard progress
export async function POST(request: NextRequest) {
  try {
    const body: FlashcardProgressRequest = await request.json()

    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'You must be logged in to save progress' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createAuthenticatedClient(token)

    // Verify the auth token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    const userId = user.id

    if (!body.studyGuideId || !body.cardId || !body.status) {
      return NextResponse.json(
        { error: 'Study guide ID, card ID, and status are required' },
        { status: 400 }
      )
    }

    if (!['mastered', 'difficult'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Status must be "mastered" or "difficult"' },
        { status: 400 }
      )
    }

    // Upsert the progress (insert or update)
    const { error } = await supabase
      .from('flashcard_progress')
      .upsert({
        user_id: userId,
        study_guide_id: body.studyGuideId,
        card_id: body.cardId,
        status: body.status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,study_guide_id,card_id'
      })

    if (error) {
      console.error('Error saving flashcard progress:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to save progress', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Save flashcard progress error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Reset all flashcard progress for a study guide
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studyGuideId = searchParams.get('studyGuideId')

    if (!studyGuideId) {
      return NextResponse.json(
        { error: 'Study guide ID is required' },
        { status: 400 }
      )
    }

    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'You must be logged in to reset progress' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createAuthenticatedClient(token)

    // Verify the auth token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Delete all progress for this user and study guide
    const { error } = await supabase
      .from('flashcard_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('study_guide_id', studyGuideId)

    if (error) {
      console.error('Error resetting flashcard progress:', error)
      return NextResponse.json(
        { error: 'Failed to reset progress' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Reset flashcard progress error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Create admin client with service role for user management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface CleverTokenResponse {
  access_token: string
  token_type: string
}

interface CleverUserResponse {
  data: {
    id: string
    district: string
    type: 'student' | 'teacher' | 'district_admin' | 'school_admin'
    authorized_by: string
  }
}

interface CleverUserDetails {
  data: {
    id: string
    email: string
    name: {
      first: string
      middle?: string
      last: string
    }
    roles: {
      student?: object
      teacher?: object
      district_admin?: object
      school_admin?: object
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_CLEVER_CLIENT_ID
    const clientSecret = process.env.CLEVER_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Missing Clever credentials')
      return NextResponse.json(
        { error: 'Clever integration not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch('https://clever.com/oauth/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/clever/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Clever token exchange failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to authenticate with Clever. Please try again.' },
        { status: 400 }
      )
    }

    const tokenData: CleverTokenResponse = await tokenResponse.json()

    // Step 2: Get user info from Clever using /me endpoint
    const meResponse = await fetch('https://api.clever.com/v3.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!meResponse.ok) {
      console.error('Failed to fetch Clever user info')
      return NextResponse.json(
        { error: 'Failed to get user information from Clever' },
        { status: 400 }
      )
    }

    const meData: CleverUserResponse = await meResponse.json()
    const cleverId = meData.data.id
    const userType = meData.data.type

    // Step 3: Get detailed user info based on type
    let userEndpoint = ''
    if (userType === 'student') {
      userEndpoint = `https://api.clever.com/v3.0/users/${cleverId}`
    } else if (userType === 'teacher') {
      userEndpoint = `https://api.clever.com/v3.0/users/${cleverId}`
    } else {
      userEndpoint = `https://api.clever.com/v3.0/users/${cleverId}`
    }

    const userResponse = await fetch(userEndpoint, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!userResponse.ok) {
      console.error('Failed to fetch Clever user details')
      return NextResponse.json(
        { error: 'Failed to get user details from Clever' },
        { status: 400 }
      )
    }

    const userData: CleverUserDetails = await userResponse.json()
    const { email, name } = userData.data

    if (!email) {
      return NextResponse.json(
        { error: 'No email address found in your Clever account' },
        { status: 400 }
      )
    }

    // Step 4: Create or get Supabase user
    // Generate a deterministic password from Clever ID (user never sees this)
    const deterministicPassword = crypto
      .createHash('sha256')
      .update(`${cleverId}-${process.env.CLEVER_CLIENT_SECRET}`)
      .digest('hex')

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .limit(1)

    let userId: string

    if (existingUsers && existingUsers.length > 0) {
      // User exists - update their Clever ID if not set
      userId = existingUsers[0].id

      // Update Clever ID in profile (add this column if needed)
      await supabaseAdmin
        .from('user_profiles')
        .update({
          clever_id: cleverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: deterministicPassword,
        email_confirm: true, // Auto-confirm since they verified with Clever
        user_metadata: {
          first_name: name.first,
          last_name: name.last,
          clever_id: cleverId
        }
      })

      if (createError || !newUser.user) {
        console.error('Failed to create Supabase user:', createError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      userId = newUser.user.id

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          email: email.toLowerCase(),
          user_type: userType === 'teacher' ? 'teacher' : 'student',
          first_name: name.first,
          last_name: name.last,
          clever_id: cleverId
        })

      if (profileError) {
        console.error('Failed to create user profile:', profileError)
        // Continue anyway - user can still sign in
      }
    }

    // Step 5: Sign the user in by creating a session
    // Use the admin API to generate a magic link, then extract the session
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`
      }
    })

    if (signInError || !sessionData) {
      console.error('Failed to create session:', signInError)
      return NextResponse.json(
        { error: 'Failed to sign in. Please try again.' },
        { status: 500 }
      )
    }

    // Return the magic link token for the client to use
    // The client will redirect to this URL to complete sign-in
    const response = NextResponse.json({
      success: true,
      magicLink: sessionData.properties?.hashed_token
        ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token_hash=${sessionData.properties.hashed_token}&type=magiclink`
        : null,
      // Fallback: return verification URL if available
      verificationUrl: sessionData.properties?.verification_token
    })

    return response

  } catch (error) {
    console.error('Clever auth error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

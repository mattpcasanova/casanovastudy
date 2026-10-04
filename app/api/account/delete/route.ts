import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { deleteAccount } from '@/lib/account'

// "Delete my account" on /account: removes the account and everything in it.
// The caller must type DELETE to confirm.
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  let confirm = ''
  try { confirm = String((await request.json()).confirm ?? '') } catch { /* handled below */ }
  if (confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 })
  try {
    await deleteAccount(user.id)
  } catch (e) {
    console.error('Account deletion failed:', e)
    return NextResponse.json({ error: 'Could not delete your account. Please contact privacy@casanovastudy.com.' }, { status: 500 })
  }
  return NextResponse.json({ deleted: true })
}

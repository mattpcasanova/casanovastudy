"use client"

import { supabase } from '@/lib/supabase'

/**
 * fetch() for our own API routes, authenticated with the signed-in user's
 * session (Bearer access token; see getRequestUser on the server).
 * Cookies are omitted: the app doesn't use auth cookies, and on localhost other
 * projects' cookies can push requests past the 16KB header limit (HTTP 431).
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(input, { credentials: 'omit', ...init, headers })
}

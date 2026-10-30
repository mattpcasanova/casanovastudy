import { NextResponse, type NextRequest } from 'next/server'
import { CLASSES_ENABLED } from '@/lib/features'
import { hiddenWhileClassesOff } from '@/lib/hidden-paths'

// While the classes feature is off, its pages answer 404 (rule in
// lib/hidden-paths.ts) so nobody lands on a half-finished page from an old
// link. API routes are untouched; every one requires sign-in.
export function middleware(request: NextRequest) {
  if (CLASSES_ENABLED || !hiddenWhileClassesOff(request.nextUrl.pathname)) return NextResponse.next()
  // A path with no route renders app/not-found.tsx with a 404 status.
  const url = request.nextUrl.clone()
  url.pathname = '/__hidden'
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/calendar/:path*', '/classes/:path*', '/my-students/:path*', '/my-teachers/:path*', '/p/:path*', '/teacher/:path*'],
}

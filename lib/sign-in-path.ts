/** Sign-in URL that brings the user back to the current page afterwards. */
export function signInPath(): string {
  if (typeof window === 'undefined') return '/auth/signin'
  const here = `${window.location.pathname}${window.location.search}`
  return here && here !== '/' && !here.startsWith('/auth/') ? `/auth/signin?next=${encodeURIComponent(here)}` : '/auth/signin'
}

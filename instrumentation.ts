// Server errors (route handlers, server components, server actions) go to our
// error log (lib/monitoring). Next calls onRequestError for every uncaught one.
import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const e = err as Error & { digest?: string }
    const { recordError } = await import('./lib/monitoring/store')
    await recordError({
      source: 'server',
      message: `${e?.name && e.name !== 'Error' ? `${e.name}: ` : ''}${e?.message ?? String(err)}`,
      stack: e?.stack ?? null,
      path: `${request.path}`,
      digest: e?.digest ?? `${context.routeType}:${context.routePath}`,
    })
  } catch (logError) {
    console.error('Could not record a server error:', logError)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Download a study guide as a PDF that matches "Print" exactly: PDFShift loads
// the real /study-guide/[id] page with print media (use_print), so every
// format's print styles (worksheets, answer keys, diagrams, code…) apply and
// there's no second HTML formatter to keep in sync.
//
// - Requires a signed-in caller (Bearer token) so anonymous traffic can't burn
//   PDFShift credits. The guide itself must be readable (guides are public).
// - Renders from NEXT_PUBLIC_APP_URL (the public site): PDFShift can't reach
//   localhost, and Vercel preview URLs are behind deployment protection.

export const maxDuration = 120

const PDFSHIFT_URL = 'https://api.pdfshift.io/v3/convert/pdf'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function filenameFor(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${slug || 'study-guide'}.pdf`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid study guide id' }, { status: 400 })

  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'PDF downloads are not configured.' }, { status: 503 })

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Sign in to download PDFs.' }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Sign in to download PDFs.' }, { status: 401 })

  const { data: guide } = await supabase.from('study_guides').select('id, title').eq('id', id).single()
  if (!guide) return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })

  const base = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '')
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(base)) {
    return NextResponse.json(
      { error: 'PDF download needs the public site URL (NEXT_PUBLIC_APP_URL). Use Print → Save as PDF locally.' },
      { status: 503 }
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 100_000)
  try {
    const res = await fetch(PDFSHIFT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        source: `${base}/study-guide/${id}`,
        use_print: true, // print media → the same layout as the Print button
        format: 'Letter',
        margin: '0.6in',
        delay: 1500, // let the client-rendered guide, fonts and math settle
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error('PDFShift error', res.status, (await res.text()).slice(0, 500))
      return NextResponse.json({ error: 'Could not create the PDF. Try Print → Save as PDF instead.' }, { status: 502 })
    }
    const pdf = Buffer.from(await res.arrayBuffer())
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameFor(guide.title)}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('PDF download failed', err)
    return NextResponse.json({ error: 'PDF creation timed out. Try Print → Save as PDF instead.' }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }
}

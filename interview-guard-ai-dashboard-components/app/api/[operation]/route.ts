import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Keep intake requests on the same origin, including when the UI uses a different port.
export async function POST(request: Request, context: { params: Promise<{ operation: string }> }) {
  const { operation } = await context.params
  if (!['parse-resume', 'analyze'].includes(operation)) return NextResponse.json({ detail: 'Unknown candidate operation.' }, { status: 404 })
  if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024) return NextResponse.json({ detail: 'Request exceeds 6 MB. Resume files must be at most 5 MB.' }, { status: 413 })
  const base = process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000'
  try {
    const result = await fetch(`${base.replace(/\/$/, '')}/api/${operation}`, {
      method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || 'application/json' },
      body: request.body, duplex: 'half', signal: AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]), cache: 'no-store',
    } as RequestInit & { duplex: 'half' })
    return NextResponse.json(await result.json(), { status: result.status, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ detail: 'Candidate backend is unavailable. Start FastAPI on port 8000 and retry.' }, { status: 503 })
  }
}

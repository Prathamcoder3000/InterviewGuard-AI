import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params
  if (!['question', 'transcribe'].includes(action)) return NextResponse.json({ detail: 'Unknown interview operation.' }, { status: 404 })
  if (Number(request.headers.get('content-length') || 0) > 8 * 1024 * 1024) return NextResponse.json({ detail: 'Request exceeds 8 MB.' }, { status: 413 })
  const base = process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000'
  try {
    const result = await fetch(`${base.replace(/\/$/, '')}/api/interview/${action}`, {
      method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || 'application/json' },
      body: request.body, duplex: 'half', signal: AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]), cache: 'no-store',
    } as RequestInit & { duplex: 'half' })
    const body = await result.json()
    return NextResponse.json(body, { status: result.status, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ detail: 'Interview backend is unavailable. Start FastAPI on port 8000 and retry.' }, { status: 503 })
  }
}

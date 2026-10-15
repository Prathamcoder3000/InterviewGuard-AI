'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, Mic, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInterviewRecorder } from '@/hooks/use-interview-recorder'
import type { RecordingMetadata } from '@/types/recording'
import { RecordingControls } from './recording-controls'
import { VideoPreview } from './video-preview'
import { RiskResultsDashboard } from './risk-results-dashboard'
import { sampleRiskResult } from './mock-data'
import { formatTimestamp } from './risk-utils'

export function InterviewRecorder({ onRecordingComplete }: { onRecordingComplete?: (blob: Blob, metadata: RecordingMetadata) => void }) {
  const recorder = useInterviewRecorder(onRecordingComplete)
  const [consent, setConsent] = useState(false)
  const [results, setResults] = useState(false)
  const [notice, setNotice] = useState('')
  const playbackRef = useRef<HTMLVideoElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const active = recorder.status === 'recording'
  function seek(timestampSec: number) {
    const video = playbackRef.current
    if (!video || !recorder.metadata) return
    const duration = Number.isFinite(video.duration) ? Math.min(video.duration, recorder.metadata.durationSec) : recorder.metadata.durationSec
    const target = Math.max(0, Math.min(timestampSec, duration))
    video.currentTime = target
    setNotice(timestampSec > duration ? `This demo event is at ${formatTimestamp(timestampSec)}, beyond your ${formatTimestamp(duration)} recording. The player was moved to the end; this event is not evidence about your session.` : `Moved to ${formatTimestamp(target)}. This is a demo timestamp, not an observation about your recording.`)
    video.scrollIntoView({ behavior: 'instant', block: 'center' })
  }
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700"><ShieldCheck className="size-5" aria-hidden="true" />InterviewGuard AI</p><h1 className="text-2xl font-semibold tracking-tight">Interview recording</h1><p className="mt-1 text-sm text-slate-600">Check your devices, record your interview, and review it locally.</p></div>
          {!recorder.url && !recorder.stream && recorder.status === 'idle' && <Link href="/" className="text-sm font-medium text-blue-700 underline underline-offset-4">View demo results</Link>}
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-labelledby="session-heading" className="min-w-0 space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="session-heading" className="font-semibold">{recorder.url ? 'Review your recording' : 'Camera preview'}</h2><span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-mono text-sm tabular-nums">{active && <span className="size-2 rounded-full bg-red-600" aria-hidden="true" />}<span>{active ? 'Recording · ' : ''}{formatTimestamp(recorder.elapsed)}</span></span></div>
            <VideoPreview stream={recorder.stream} url={recorder.url} playbackRef={playbackRef} />
            <div className="flex flex-wrap gap-4 text-sm text-slate-600"><span className="flex items-center gap-2"><Camera className="size-4" aria-hidden="true" />Camera: {recorder.stream ? 'on' : 'off'}</span><span className="flex items-center gap-2"><Mic className="size-4" aria-hidden="true" />Microphone: {recorder.stream ? 'on' : 'off'}</span></div>
            {!recorder.url && <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700"><input type="checkbox" checked={consent} disabled={recorder.status !== 'idle'} onChange={e => setConsent(e.target.checked)} className="mt-1 size-4 accent-blue-600" /><span>I consent to camera and microphone capture. Recordings stay in this page’s memory until I download them or leave. No video or audio is uploaded.</span></label>}
            <RecordingControls {...recorder} consent={consent} mimeType={recorder.metadata?.mimeType} retake={() => { recorder.retake(); setResults(false); setNotice('') }} />
            {recorder.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{recorder.error}</p>}
            <p role="status" className="text-sm text-slate-600">{recorder.status === 'ready' ? 'Ready. Live preview is muted to prevent feedback; your microphone will be recorded.' : recorder.status === 'complete' ? 'Recording saved locally. Use the player controls to replay, seek, or mute/unmute playback.' : recorder.status === 'requesting' ? 'Allow both devices in your browser prompt. You can cancel while waiting.' : active ? 'Camera and microphone are recording. Stop to review.' : 'Enable your devices when you are ready.'}</p>
            {recorder.url && <Button variant="outline" onClick={() => { setResults(true); requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ block: 'start' })) }}>Continue to demo results</Button>}
            {notice && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
          </section>
          <aside className="space-y-5">
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Before you start</h2><ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600"><li>Use a quiet space and check your camera framing.</li><li>Allow camera and microphone access, then start recording.</li><li>Speak a short test sentence. Stop and play it back to check audio.</li><li>Download the recording before leaving this page.</li></ol><p className="text-xs leading-relaxed text-slate-500">Live preview is mirrored for comfort. The saved video is not mirrored. Retake discards the current recording.</p></section>
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Session details</h2><dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="capitalize">{recorder.status}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Storage</dt><dd>Local memory only</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Face observations</dt><dd>Not evaluated</dd></div>{recorder.metadata && <><div><dt className="text-slate-500">Format</dt><dd className="break-all">{recorder.metadata.mimeType}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Size / duration</dt><dd>{(recorder.metadata.fileSize / 1048576).toFixed(2)} MB / {formatTimestamp(recorder.metadata.durationSec)}</dd></div><div><dt className="text-slate-500">Completed</dt><dd>{recorder.metadata.status === 'interrupted' ? 'Interrupted — review before using' : 'Complete'}</dd></div></>}</dl></section>
          </aside>
        </div>
      </div>
      {results && recorder.url && <div ref={resultsRef}><div className="mx-auto max-w-7xl px-4 pt-6 md:px-8"><p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Demo results and demo events.</strong> All scores, candidate information, and events below are sample data, not analysis of your recording. Timestamp clicks demonstrate playback seeking only.</p></div><RiskResultsDashboard result={sampleRiskResult} onSeek={seek} /></div>}
    </main>
  )
}

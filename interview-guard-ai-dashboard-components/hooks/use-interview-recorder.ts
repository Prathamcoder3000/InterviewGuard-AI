'use client'

import { useEffect, useRef, useState } from 'react'
import type { RecordingMetadata, RecordingStatus } from '@/types/recording'

const formats = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']

function mediaError(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return 'Camera or microphone permission was denied. Allow both in your browser settings and try again.'
  if (name === 'NotFoundError') return 'A camera and microphone are required. Connect both devices and try again.'
  if (name === 'NotReadableError') return 'Camera or microphone is unavailable or in use. Close other apps using it and try again.'
  return error instanceof Error ? error.message : 'Recording failed. Enable your devices and try again.'
}

export function useInterviewRecorder(onRecordingComplete?: (blob: Blob, metadata: RecordingMetadata) => void) {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<RecordingMetadata | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const resources = useRef({ stream: null as MediaStream | null, recorder: null as MediaRecorder | null, url: null as string | null, generation: 0, busy: false, started: 0, ended: 0, interrupted: false })
  const complete = useRef(onRecordingComplete)
  useEffect(() => { complete.current = onRecordingComplete }, [onRecordingComplete])

  function releaseTracks() {
    resources.current.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
    resources.current.stream = null
    setStream(null)
  }

  function stop() {
    const r = resources.current
    if (r.recorder?.state === 'recording') {
      r.ended = performance.now()
      setStatus('stopping')
      try {
        r.recorder.stop()
      } catch (e) {
        r.generation++
        r.recorder.onstop = null
        r.recorder.ondataavailable = null
        r.recorder.onerror = null
        r.recorder = null
        setError(mediaError(e))
        setStatus('idle')
      } finally {
        releaseTracks()
      }
    }
  }

  function disable() {
    const r = resources.current
    if (r.recorder && r.recorder.state !== 'inactive') { stop(); return }
    r.generation++
    r.busy = false
    releaseTracks()
    setStatus(r.url ? 'complete' : 'idle')
  }

  async function enable() {
    const r = resources.current
    if (r.busy || r.stream || r.recorder) return
    r.busy = true
    const generation = ++r.generation
    setError('')
    setStatus('requesting')
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a supported browser.')
      if (typeof MediaRecorder === 'undefined') throw new Error('Recording is unsupported in this browser. Try a current Chrome, Edge, Firefox, or Safari browser.')
      if (!formats.some(type => MediaRecorder.isTypeSupported(type))) throw new Error('No supported video and audio recording format is available in this browser.')
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }, audio: true })
      if (generation !== r.generation) { acquired.getTracks().forEach(track => track.stop()); return }
      if (!acquired.getVideoTracks().length || !acquired.getAudioTracks().length) { acquired.getTracks().forEach(track => track.stop()); throw new Error('Both a camera and microphone are required.') }
      r.stream = acquired
      acquired.getTracks().forEach(track => { track.onended = () => {
        r.interrupted = true
        setError('A device disconnected or access ended. Any captured recording is available below; reconnect your devices to retake.')
        if (r.recorder?.state === 'recording') stop()
        else { releaseTracks(); setStatus(r.url ? 'complete' : 'idle') }
      } })
      setStream(acquired)
      setStatus('ready')
    } catch (e) {
      if (generation === r.generation) { releaseTracks(); setError(mediaError(e)); setStatus(r.url ? 'complete' : 'idle') }
    } finally { if (generation === r.generation) r.busy = false }
  }

  function start() {
    const r = resources.current
    if (!r.stream || r.recorder || r.busy) return
    if (r.stream.getTracks().some(track => track.readyState !== 'live')) { disable(); setError('A device disconnected. Enable your camera and microphone again.'); return }
    setError('')
    const generation = r.generation
    try {
      let mimeType = formats.find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('No supported recording format is available.')
      // A browser can advertise a codec that its current encoder cannot open.
      // Try each supported container/codec before giving up on the devices.
      let recorder: MediaRecorder | undefined
      for (const candidate of formats.filter(type => MediaRecorder.isTypeSupported(type))) {
        try { recorder = new MediaRecorder(r.stream, { mimeType: candidate }); mimeType = candidate; break } catch { /* Try the next supported encoder. */ }
      }
      if (!recorder) throw new Error('The browser could not open a video/audio encoder. Close other recording apps and try again.')
      const capture = recorder
      const chunks: Blob[] = []
      const recordedAt = new Date().toISOString()
      r.recorder = recorder
      r.interrupted = false
      r.ended = 0
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onerror = () => {
        r.interrupted = true
        setError('Recording was interrupted. Review any captured video or retake.')
        if (capture.state === 'recording') stop()
        else { setStatus('stopping'); releaseTracks() }
      }
      recorder.onstop = () => {
        if (generation !== r.generation) return
        r.recorder = null
        releaseTracks()
        const durationSec = Math.max(0, ((r.ended || performance.now()) - r.started) / 1000)
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType })
        if (!blob.size) { setError('The recording was empty. Enable your devices and try again.'); setStatus('idle'); return }
        if (r.url) URL.revokeObjectURL(r.url)
        r.url = URL.createObjectURL(blob)
        const info: RecordingMetadata = { durationSec, mimeType: blob.type, fileSize: blob.size, recordedAt, status: r.interrupted ? 'interrupted' : 'complete' }
        setUrl(r.url)
        setMetadata(info)
        setElapsed(durationSec)
        setStatus('complete')
        complete.current?.(blob, info)
      }
      r.started = performance.now()
      recorder.start(1000)
      setElapsed(0)
      setStatus('recording')
    } catch (e) {
      if (r.recorder) {
        r.recorder.onstop = null
        r.recorder.ondataavailable = null
        r.recorder.onerror = null
        try { if (r.recorder.state !== 'inactive') r.recorder.stop() } catch { /* Tracks are released below even if the encoder has failed. */ }
      }
      r.recorder = null
      releaseTracks()
      setError(mediaError(e))
      setStatus('idle')
    }
  }

  function retake() {
    disable()
    const r = resources.current
    r.generation++
    if (r.recorder) {
      r.recorder.onstop = null
      r.recorder.ondataavailable = null
      r.recorder.onerror = null
      r.recorder = null
    }
    if (r.url) URL.revokeObjectURL(r.url)
    r.url = null
    setUrl(null)
    setMetadata(null)
    setElapsed(0)
    setError('')
    setStatus('idle')
  }

  useEffect(() => {
    if (status !== 'recording') return
    const timer = window.setInterval(() => setElapsed((performance.now() - resources.current.started) / 1000), 250)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => {
    const r = resources.current
    const warn = (event: BeforeUnloadEvent) => {
      if (r.recorder || r.url) { event.preventDefault(); event.returnValue = '' }
    }
    const close = () => {
      r.generation++
      r.busy = false
      if (r.recorder) {
        r.recorder.onstop = null
        r.recorder.ondataavailable = null
        r.recorder.onerror = null
        try { if (r.recorder.state !== 'inactive') r.recorder.stop() } catch { /* Unmount must still release devices. */ }
        r.recorder = null
      }
      r.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
      r.stream = null
      if (r.url) URL.revokeObjectURL(r.url)
      r.url = null
    }
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      // pagehide releases private media even when the browser caches this page.
      // A back/forward restoration must not display a revoked playback URL.
      setStream(null)
      setUrl(null)
      setMetadata(null)
      setElapsed(0)
      setStatus('idle')
      setError('This session was closed when you left the page. Enable your devices to record again.')
    }
    window.addEventListener('beforeunload', warn)
    window.addEventListener('pagehide', close)
    window.addEventListener('pageshow', restore)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('pagehide', close); window.removeEventListener('pageshow', restore); close() }
  }, [])

  return { status, stream, url, metadata, elapsed, error, enable, disable, start, stop, retake }
}

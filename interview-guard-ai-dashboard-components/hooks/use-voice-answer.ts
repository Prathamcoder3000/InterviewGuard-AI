'use client'

import { useEffect, useRef, useState } from 'react'
import { transcribeAnswer } from '@/lib/interviewer-api'

export function useVoiceAnswer(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'transcribing'>('idle')
  const [error, setError] = useState('')
  const callback = useRef(onTranscript)
  useEffect(() => { callback.current = onTranscript }, [onTranscript])
  const state = useRef({ generation: 0, busy: false, stream: null as MediaStream | null, recorder: null as MediaRecorder | null, abort: null as AbortController | null, timer: 0 })

  function release() {
    const s = state.current
    window.clearTimeout(s.timer)
    s.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
    s.stream = null
  }
  function cancel(notify = true) {
    const s = state.current
    s.generation++
    s.abort?.abort()
    s.abort = null
    if (s.recorder) {
      s.recorder.onstop = null
      s.recorder.ondataavailable = null
      s.recorder.onerror = null
      try { if (s.recorder.state !== 'inactive') s.recorder.stop() } catch { /* Release tracks even if the encoder failed. */ }
      s.recorder = null
    }
    release()
    s.busy = false
    if (notify) { setStatus('idle'); setError('') }
  }
  function stop() {
    const s = state.current
    try { if (s.recorder?.state === 'recording') { s.recorder.stop(); release() } }
    catch { cancel(); setError('Answer recording could not finish. Retry or type your answer.') }
  }
  async function start() {
    const s = state.current
    if (s.busy) return
    s.busy = true
    const token = ++s.generation
    setError('')
    setStatus('requesting')
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Voice answers require HTTPS or localhost and a browser supporting audio recording. You can type your answer instead.')
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('This browser has no supported audio encoder. Type your answer instead.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (token !== s.generation) { stream.getTracks().forEach(track => track.stop()); return }
      s.stream = stream
      const recorder = new MediaRecorder(stream, { mimeType })
      s.recorder = recorder
      const chunks: Blob[] = []
      let bytes = 0
      recorder.ondataavailable = event => {
        if (token !== s.generation) return
        bytes += event.data.size
        if (bytes > 8 * 1024 * 1024) { cancel(); setError('Answer audio exceeded 8 MB. Record a shorter answer or type it.'); return }
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => { cancel(); setError('Microphone recording failed. Check device permissions or type your answer.') }
      recorder.onstop = async () => {
        if (token !== s.generation) return
        release()
        s.recorder = null
        const audio = new Blob(chunks, { type: recorder.mimeType || mimeType })
        chunks.length = 0
        if (!audio.size) { s.busy = false; setStatus('idle'); setError('No audio was captured. Retry or type your answer.'); return }
        setStatus('transcribing')
        const abort = new AbortController()
        s.abort = abort
        try {
          const result = await transcribeAnswer(audio, abort.signal)
          if (token === s.generation) callback.current(result.text)
        } catch (e) {
          if (token === s.generation && !abort.signal.aborted) setError(e instanceof Error ? e.message : 'Transcription failed. Retry or type your answer.')
        } finally {
          if (token === s.generation) { s.busy = false; s.abort = null; setStatus('idle') }
        }
      }
      stream.getAudioTracks().forEach(track => { track.onended = stop })
      recorder.start(1000)
      s.timer = window.setTimeout(stop, 120_000)
      setStatus('recording')
    } catch (e) {
      if (token === s.generation) {
        cancel()
        const denied = e instanceof DOMException && e.name === 'NotAllowedError'
        setError(denied ? 'Microphone permission was denied. Allow access in your browser or type your answer.' : e instanceof Error ? e.message : 'Voice recording is unavailable. Type your answer instead.')
      }
    }
  }
  useEffect(() => {
    const close = () => cancel(false)
    const restore = (event: PageTransitionEvent) => { if (event.persisted) { setStatus('idle'); setError('The voice answer was cancelled when you left the page. Record again or type your answer.') } }
    window.addEventListener('pagehide', close)
    window.addEventListener('pageshow', restore)
    return () => { window.removeEventListener('pagehide', close); window.removeEventListener('pageshow', restore); close() }
  }, [])
  return { status, error, start, stop, cancel: () => cancel() }
}

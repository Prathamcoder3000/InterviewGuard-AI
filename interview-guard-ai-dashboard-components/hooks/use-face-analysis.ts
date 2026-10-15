'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { FaceObservation } from '@/lib/face-analysis-policy'

export function useFaceAnalysis(videoRef: RefObject<HTMLVideoElement | null>, stream: MediaStream | null) {
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<'off' | 'loading' | 'running' | 'unavailable'>('off')
  const [error, setError] = useState('')
  const [observation, setObservation] = useState<FaceObservation | null>(null)
  const [referenceReady, setReferenceReady] = useState(false)
  const [referenceBusy, setReferenceBusy] = useState(false)
  const reference = useRef<Float32Array | null>(null)
  const generation = useRef(0)
  const referenceVersion = useRef(0)
  const source = useRef(stream)
  const busy = useRef(false)
  const inFlight = useRef<Promise<unknown>>(Promise.resolve())

  function clearReference() {
    referenceVersion.current++
    reference.current?.fill(0)
    reference.current = null
    setReferenceReady(false)
    setObservation(null)
  }
  function stop() {
    generation.current++
    setEnabled(false)
    setStatus('off')
    setError('')
    clearReference()
  }
  async function setPhoto(file: File) {
    if (busy.current || !enabled || status !== 'running') return
    const token = generation.current
    busy.current = true
    setReferenceBusy(true)
    clearReference()
    const photoVersion = referenceVersion.current
    setError('')
    try {
      await inFlight.current
      if (token !== generation.current || photoVersion !== referenceVersion.current) return
      const runtime = await import('@/lib/face-runtime')
      const descriptor = await runtime.referenceFromPhoto(file)
      if (token !== generation.current || photoVersion !== referenceVersion.current) { descriptor.fill(0); return }
      reference.current = descriptor
      setReferenceReady(true)
    } catch (e) {
      if (token === generation.current && photoVersion === referenceVersion.current) setError(e instanceof Error ? e.message : 'Reference photo could not be processed. Try a clear front-facing photo.')
    } finally { busy.current = false; setReferenceBusy(false) }
  }

  useEffect(() => {
    const previous = source.current
    source.current = stream
    if (previous && !stream) { clearReference(); setObservation(null) }
  }, [stream])

  useEffect(() => {
    if (!enabled) { setStatus('off'); setObservation(null); clearReference(); return }
    const token = ++generation.current
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const canvas = document.createElement('canvas')
    setStatus('loading')
    setError('')
    const valid = () => !cancelled && token === generation.current
    const tick = async () => {
      if (!valid()) return
      const video = videoRef.current
      const currentStream = source.current
      const currentReferenceVersion = referenceVersion.current
      try {
        if (!document.hidden && !busy.current && video && video.readyState >= 2 && video.videoWidth && currentStream?.getVideoTracks().some(track => track.readyState === 'live')) {
          canvas.width = Math.min(640, video.videoWidth)
          canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth)
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error('Canvas processing is unavailable.')
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const runtime = await import('@/lib/face-runtime')
          if (!valid()) return
          const task = runtime.inspectFace(canvas, reference.current)
          inFlight.current = task
          const next = await task
          if (valid() && currentStream === source.current && currentReferenceVersion === referenceVersion.current) setObservation(next)
        }
      } catch {
        if (valid()) { setStatus('unavailable'); setError('Face analysis is unavailable. Your recording still works. Stop analysis and enable it again to retry.'); clearReference() }
        return
      } finally { canvas.width = 0; canvas.height = 0 }
      if (valid()) timer = setTimeout(tick, 1000)
    }
    void (async () => {
      try {
        const runtime = await import('@/lib/face-runtime')
        await runtime.loadFaceRuntime()
        if (valid()) { setStatus('running'); void tick() }
      } catch {
        if (valid()) { setStatus('unavailable'); setError('Face models could not load. Recording remains available. Check the model files and retry.') }
      }
    })()
    const hide = () => { generation.current++; setEnabled(false); clearReference(); setObservation(null); setStatus('off') }
    window.addEventListener('pagehide', hide)
    return () => {
      cancelled = true
      generation.current++
      if (timer) clearTimeout(timer)
      window.removeEventListener('pagehide', hide)
      reference.current?.fill(0)
      reference.current = null
      referenceVersion.current++
      // Let an in-progress inference finish before clearing its input pixels.
      void inFlight.current.catch(() => {}).finally(() => { canvas.width = 0; canvas.height = 0 })
    }
  }, [enabled, videoRef])

  return { enabled, status, error, observation, referenceReady, referenceBusy, clearReference, setPhoto, start: () => { setEnabled(true) }, stop }
}

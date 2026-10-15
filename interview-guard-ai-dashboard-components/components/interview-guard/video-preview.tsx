'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Video, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function VideoPreview({ stream, url, playbackRef, liveRef }: { stream: MediaStream | null; url: string | null; playbackRef: RefObject<HTMLVideoElement | null>; liveRef: RefObject<HTMLVideoElement | null> }) {
  const resolvingDuration = useRef(false)
  const [muted, setMuted] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  useEffect(() => { setPlaybackError(''); setMuted(false) }, [url])
  useEffect(() => {
    const video = liveRef.current
    if (!video) return
    video.srcObject = stream
    return () => { video.srcObject = null }
  }, [stream])
  return (
    <div className="space-y-3">
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white">
      {url ? (
        <video key={url} ref={playbackRef} src={url} controls muted={muted} playsInline preload="auto" aria-label="Recorded interview playback" className="h-full w-full object-contain"
          onVolumeChange={event => setMuted(event.currentTarget.muted)}
          onError={() => setPlaybackError('This browser could not play the recording. Download it to try a compatible media player, or retake in another browser.')}
          onLoadedMetadata={event => {
            // Some MediaRecorder WebM files omit duration. Ask the decoder to find
            // the end before returning to the beginning, enabling native seeking.
            resolvingDuration.current = event.currentTarget.duration === Infinity
            if (resolvingDuration.current) event.currentTarget.currentTime = 1e10
          }}
          onTimeUpdate={event => {
            if (resolvingDuration.current && Number.isFinite(event.currentTarget.duration)) {
              resolvingDuration.current = false
              event.currentTarget.currentTime = 0
            }
          }}
        />
      ) : (
        <>
          <video ref={liveRef} autoPlay muted playsInline aria-label="Mirrored live camera preview, muted" className="h-full w-full -scale-x-100 object-contain" />
          {!stream && <div className="absolute flex flex-col items-center gap-3 p-6 text-center"><Video className="size-10 text-slate-400" aria-hidden="true" /><p>Enable your camera and microphone to begin</p><p className="text-sm text-slate-400">Your preview appears here</p></div>}
        </>
      )}
    </div>
    {url && <Button variant="interview-outline" onClick={() => setMuted(value => !value)} aria-pressed={muted}>{muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}{muted ? 'Unmute playback' : 'Mute playback'}</Button>}
    {playbackError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{playbackError}</p>}
    </div>
  )
}

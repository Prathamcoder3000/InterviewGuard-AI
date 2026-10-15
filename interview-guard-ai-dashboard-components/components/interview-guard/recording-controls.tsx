import { Camera, Circle, Download, RotateCcw, Square, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RecordingStatus } from '@/types/recording'

interface Props {
  status: RecordingStatus
  consent: boolean
  url: string | null
  mimeType?: string
  enable: () => void
  disable: () => void
  start: () => void
  stop: () => void
  retake: () => void
}

export function RecordingControls({ status, consent, url, mimeType, enable, disable, start, stop, retake }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {(status === 'idle' || status === 'requesting') && <Button size="lg" disabled={!consent || status === 'requesting'} onClick={enable} className="bg-blue-600 text-white hover:bg-blue-700"><Camera aria-hidden="true" />{status === 'requesting' ? 'Waiting for permission…' : 'Enable camera & microphone'}</Button>}
      {status === 'requesting' && <Button variant="outline" onClick={disable}>Cancel</Button>}
      {status === 'ready' && <><Button size="lg" onClick={start} className="bg-blue-600 text-white hover:bg-blue-700"><Circle aria-hidden="true" />Start recording</Button><Button size="lg" variant="outline" onClick={disable}><VideoOff aria-hidden="true" />Disable camera</Button></>}
      {(status === 'recording' || status === 'stopping') && <><Button size="lg" variant="destructive" onClick={stop} disabled={status === 'stopping'}><Square aria-hidden="true" />{status === 'stopping' ? 'Finishing recording…' : 'Stop recording'}</Button><Button size="lg" variant="outline" onClick={retake} disabled={status === 'stopping'}>Cancel recording</Button></>}
      {url && status === 'complete' && <><Button size="lg" variant="outline" onClick={retake}><RotateCcw aria-hidden="true" />Retake</Button><a href={url} download={`interview-${new Date().toISOString().slice(0, 10)}.${mimeType?.includes('mp4') ? 'mp4' : 'webm'}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Download className="size-4" aria-hidden="true" />Download recording</a></>}
    </div>
  )
}

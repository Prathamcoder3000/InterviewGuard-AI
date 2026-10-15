export type RecordingStatus = 'idle' | 'requesting' | 'ready' | 'recording' | 'stopping' | 'complete'

export interface RecordingMetadata {
  durationSec: number
  mimeType: string
  fileSize: number
  recordedAt: string
  status: 'complete' | 'interrupted'
}

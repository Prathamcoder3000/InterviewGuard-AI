import type { Metadata } from 'next'
import { InterviewRecorder } from '@/components/interview-guard/interview-recorder'

export const metadata: Metadata = {
  title: 'Record Interview | InterviewGuard AI',
  description: 'Record and review a webcam interview locally on your device.',
}

export default function InterviewPage() {
  return <InterviewRecorder />
}

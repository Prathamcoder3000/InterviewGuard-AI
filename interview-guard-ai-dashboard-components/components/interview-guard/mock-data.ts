import type { InterviewAnalysisInput, InterviewRiskResult } from './types'
import { applyAnalysisPolicy } from './analysis-policy'

// Fictional, explicitly labeled demo evidence. Never attached to a local recording.
export const sampleAnalysisInput: InterviewAnalysisInput = {
  interviewRules: { notesProhibited: false, proctoringApproved: false },
  evidence: [
    { id: 'q1', timestampSec: 40, source: 'transcript', detail: 'Interviewer: What is a Python dictionary? Candidate: A mapping from keys to values. In our API I used one to count requests by customer ID.' },
    { id: 'q2', timestampSec: 92, source: 'transcript', detail: 'Interviewer: Why use a dictionary for counts? Candidate: I can look up the existing count by key, increment it, and store it back. A list would require searching for each customer.' },
    { id: 'experience', timestampSec: 15, source: 'interviewer', detail: 'Candidate claims experience implementing Python APIs and request counters. The dictionary example is consistent with that specific claim; other claimed skills have not been assessed.' },
    { id: 'q3', timestampSec: 160, source: 'transcript', detail: 'Interviewer: Are Python lists mutable? Candidate: No, a list cannot be changed after it is created.' },
    { id: 'q4', timestampSec: 205, source: 'transcript', detail: 'Interviewer: What happens when append is called on an existing list? Candidate: It modifies the same list in place. The earlier statement was not explained or reconciled during this demo.' },
    { id: 'delivery', timestampSec: 92, source: 'interviewer', detail: 'The dictionary explanation was correct and relevant. The candidate paused several times and spoke at an uneven pace. No inference about emotion, honesty, or identity was made.' },
    { id: 'device', timestampSec: 260, source: 'video', detail: 'Fictional demo observation: the candidate visibly scrolls on another device. Its content and purpose are unknown. Interview rules did not prohibit reference notes; unauthorized assistance cannot be established.' },
  ],
  positive: [
    { criterion: 'relevance', status: 'observed', explanation: 'The dictionary answers address the questions asked.', evidenceIds: ['q1', 'q2'] },
    { criterion: 'own_words', status: 'observed', explanation: 'The candidate describes the counting approach using a concrete work example.', evidenceIds: ['q1', 'q2'] },
    { criterion: 'experience_consistency', status: 'observed', explanation: 'The API counter example is consistent with the specific Python experience claim reviewed.', evidenceIds: ['experience', 'q1'] },
    { criterion: 'follow_up', status: 'observed', explanation: 'The candidate independently explains why a dictionary fits the counting task.', evidenceIds: ['q2'] },
    { criterion: 'reasoning', status: 'observed', explanation: 'The answer explains lookup and increment operations and compares them with list searching.', evidenceIds: ['q2'] },
  ],
  negative: [
    { criterion: 'contradiction', status: 'observed', explanation: 'The two statements about list mutability conflict. Ask a targeted follow-up; this does not establish dishonesty.', evidenceIds: ['q3'], relatedEvidenceIds: ['q4'] },
  ],
  externalAssistance: [
    { criterion: 'visible_device', status: 'observed', explanation: 'A separate device is visibly used in the fictional video example. Its purpose requires verification; unauthorized help is not established.', evidenceIds: ['device'] },
  ],
  communication: [
    { criterion: 'frequent_pauses', status: 'observed', explanation: 'Pauses coexist with a correct technical explanation. They add zero review points.', evidenceIds: ['delivery'] },
    { criterion: 'uneven_pace', status: 'observed', explanation: 'Uneven pace is a communication observation, separate from technical correctness and excluded from risk scoring.', evidenceIds: ['delivery'] },
  ],
}

export const sampleRiskResult: InterviewRiskResult = applyAnalysisPolicy({
  sessionId: 'IG-DEMO-2026-10-4821',
  candidate: { name: 'Jordan Ellis', role: 'Backend Engineer' },
  interviewer: 'Priya Natarajan',
  conductedAt: '2026-10-14T15:30:00Z',
  durationSec: 360,
  overallScore: 0,
  riskLevel: 'low',
  confidence: 0,
  baseScore: 0,
  modelVersion: 'answer-review-rubric-v1',
  summary: '',
  signals: [], factors: [], events: [],
  recommendation: { action: 'manual_review', rationale: '', nextSteps: [] },
  analysisInput: sampleAnalysisInput,
})

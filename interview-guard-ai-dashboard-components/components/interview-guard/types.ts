export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type SignalCategory = 'behavioral' | 'audio' | 'content' | 'environment'

export type EvidenceType =
  | 'gaze'
  | 'audio'
  | 'ai_text'
  | 'tab_switch'
  | 'face'
  | 'latency'
  | 'answer'

export type RecommendedAction = 'proceed' | 'manual_review' | 'reject'

export type ReviewerDecision = 'confirm_flag' | 'clear_candidate' | 'escalate'

export interface RiskSignal {
  id: string
  label: string
  category: SignalCategory
  /** 0–100, higher = more suspicious */
  score: number
  /** 0–1, relative importance in the model */
  weight: number
  description: string
}

export interface ExplanationFactor {
  id: string
  feature: string
  /** Points added to (+) or removed from (−) the base risk score */
  contribution: number
  detail: string
}

export interface EvidenceEvent {
  id: string
  timestampSec: number
  durationSec?: number
  type: EvidenceType
  severity: RiskLevel
  title: string
  description: string
  transcript?: string
  /** 0–1 model confidence for this event */
  confidence?: number
}

export interface Recommendation {
  action: RecommendedAction
  rationale: string
  nextSteps: string[]
}

export interface InterviewRiskResult {
  /** Structured evidence is required; legacy scores are never trusted by the dashboard. */
  analysisInput?: InterviewAnalysisInput
  sessionId: string
  candidate: {
    name: string
    role: string
  }
  interviewer: string
  /** ISO date string */
  conductedAt: string
  durationSec: number
  /** 0–100 */
  overallScore: number
  riskLevel: RiskLevel
  /** 0–1 */
  confidence: number
  /** Population base rate the explanation factors are applied on top of */
  baseScore: number
  modelVersion: string
  summary: string
  signals: RiskSignal[]
  factors: ExplanationFactor[]
  events: EvidenceEvent[]
  recommendation: Recommendation
}

export type PositiveCriterion = 'relevance' | 'own_words' | 'experience_consistency' | 'follow_up' | 'reasoning'
export type NegativeCriterion = 'contradiction' | 'repeated_unrelated' | 'experience_mismatch' | 'cannot_explain_material'
export type AssistanceCriterion = 'visible_device' | 'prohibited_notes' | 'material_with_failed_follow_up' | 'approved_proctoring'
export type CommunicationCriterion = 'frequent_pauses' | 'uneven_pace' | 'unsteady_delivery' | 'self_reported_nervousness'
export interface AnalysisEvidence {
  id: string
  timestampSec: number
  source: 'transcript' | 'video' | 'interviewer' | 'approved_proctoring'
  detail: string
}
export interface AnalysisFinding<Criterion extends string> {
  criterion: Criterion
  status: 'observed' | 'not_observed' | 'not_evaluated'
  explanation: string
  evidenceIds: string[]
  /** Required for contradictions, repeated responses, and failed follow-ups. */
  relatedEvidenceIds?: string[]
}
export interface InterviewAnalysisInput {
  evidence: AnalysisEvidence[]
  positive: AnalysisFinding<PositiveCriterion>[]
  negative: AnalysisFinding<NegativeCriterion>[]
  externalAssistance: AnalysisFinding<AssistanceCriterion>[]
  communication: AnalysisFinding<CommunicationCriterion>[]
  interviewRules: { notesProhibited: boolean; proctoringApproved: boolean }
}

export interface ReviewerDecisionPayload {
  sessionId: string
  decision: ReviewerDecision
  note: string
}

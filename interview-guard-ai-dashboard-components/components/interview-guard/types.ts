export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type SignalCategory = 'behavioral' | 'audio' | 'content' | 'environment'

export type EvidenceType =
  | 'gaze'
  | 'audio'
  | 'ai_text'
  | 'tab_switch'
  | 'face'
  | 'latency'

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
  confidence: number
}

export interface Recommendation {
  action: RecommendedAction
  rationale: string
  nextSteps: string[]
}

export interface InterviewRiskResult {
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

export interface ReviewerDecisionPayload {
  sessionId: string
  decision: ReviewerDecision
  note: string
}

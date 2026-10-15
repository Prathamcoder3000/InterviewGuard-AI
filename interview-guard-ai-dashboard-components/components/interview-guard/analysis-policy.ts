import type { AnalysisEvidence, AnalysisFinding, InterviewAnalysisInput, InterviewRiskResult } from './types'

export const positiveCriteria = {
  relevance: 'Answers are relevant to the questions asked',
  own_words: 'Explains concepts in their own words',
  experience_consistency: 'Answers are consistent with claimed skills and experience',
  follow_up: 'Can answer follow-up questions',
  reasoning: 'Can explain examples or reasoning behind answers',
} as const
export const negativeCriteria = {
  contradiction: 'Answers conflict with previous answers',
  repeated_unrelated: 'Repeated unrelated responses',
  experience_mismatch: 'Response conflicts with claimed experience',
  cannot_explain_material: 'Reads material but cannot explain it in a follow-up',
} as const
export const assistanceCriteria = {
  visible_device: 'Visible use of another device or on-screen material',
  prohibited_notes: 'Observable use of notes or a script prohibited by interview rules',
  material_with_failed_follow_up: 'Repeats supplied material and cannot explain it independently',
  approved_proctoring: 'Evidence from an approved interview integrity system',
} as const
export const communicationCriteria = {
  frequent_pauses: 'Frequent pauses',
  uneven_pace: 'Uneven speaking pace',
  unsteady_delivery: 'Unsteady delivery',
  self_reported_nervousness: 'Candidate reports feeling nervous',
} as const

export interface AssessedFinding {
  criterion: string
  label: string
  status: 'observed' | 'not_observed' | 'not_evaluated'
  explanation: string
  evidence: AnalysisEvidence[]
}

export function evaluateAnalysis(input?: InterviewAnalysisInput) {
  const evidence = new Map<string, AnalysisEvidence>()
  for (const item of input?.evidence ?? []) {
    if (item.id && item.detail.trim() && Number.isFinite(item.timestampSec) && item.timestampSec >= 0 && !evidence.has(item.id)) evidence.set(item.id, item)
  }
  function assess(labels: Record<string, string>, findings: AnalysisFinding<string>[] = [], dimension: string): AssessedFinding[] {
    return Object.entries(labels).map(([criterion, label]) => {
      const matches = findings.filter(item => item.criterion === criterion)
      const finding = matches.length === 1 ? matches[0] : undefined
      const primary = (finding?.evidenceIds ?? []).map(id => evidence.get(id))
      const related = (finding?.relatedEvidenceIds ?? []).map(id => evidence.get(id))
      const refs = [...primary, ...related].filter((item): item is AnalysisEvidence => Boolean(item))
      let valid = Boolean(finding?.explanation.trim() && primary.length && primary.every(Boolean) && related.every(Boolean))
      if (dimension === 'positive' || dimension === 'negative') valid &&= refs.every(item => item.source === 'transcript' || item.source === 'interviewer')
      if (dimension === 'negative') valid &&= related.length > 0 && related.some(item => item && !primary.some(first => first?.id === item.id))
      if (dimension === 'external') {
        if (criterion === 'visible_device' || criterion === 'prohibited_notes') valid &&= refs.some(item => item.source === 'video')
        if (criterion === 'prohibited_notes') valid &&= input?.interviewRules.notesProhibited === true
        if (criterion === 'material_with_failed_follow_up') valid &&= related.length > 0 && related.some(item => item && !primary.some(first => first?.id === item.id)) && refs.every(item => item.source === 'transcript' || item.source === 'interviewer')
        if (criterion === 'approved_proctoring') valid &&= input?.interviewRules.proctoringApproved === true && refs.some(item => item.source === 'approved_proctoring')
      }
      return {
        criterion, label,
        status: valid && (finding?.status === 'observed' || finding?.status === 'not_observed') ? finding.status : 'not_evaluated',
        explanation: valid ? finding!.explanation : 'Not evaluated — sufficient linked evidence and context have not been supplied.',
        evidence: valid ? Array.from(new Map(refs.map(item => [item.id, item])).values()) : [],
      }
    })
  }
  const positive = assess(positiveCriteria, input?.positive, 'positive')
  const negative = assess(negativeCriteria, input?.negative, 'negative')
  const externalAssistance = assess(assistanceCriteria, input?.externalAssistance, 'external')
  const communication = assess(communicationCriteria, input?.communication, 'communication')
  const observed = negative.filter(item => item.status === 'observed')
  const assessed = negative.filter(item => item.status !== 'not_evaluated').length
  // Only the four answer-content review criteria contribute. There is no fraud,
  // deepfake, emotion, identity, gaze, pause, or assistance probability here.
  return { positive, negative, externalAssistance, communication, observed, assessed, score: assessed ? observed.length * 25 : null }
}

/** Enforce policy at the display boundary, including for future backend results. */
export function applyAnalysisPolicy(result: InterviewRiskResult): InterviewRiskResult {
  const analysis = evaluateAnalysis(result.analysisInput)
  const score = analysis.score ?? 0
  return {
    ...result,
    overallScore: score,
    riskLevel: score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low',
    baseScore: 0,
    confidence: 0,
    modelVersion: 'answer-review-rubric-v1',
    summary: analysis.score === null
      ? 'Not evaluated. No sufficient answer-content evidence has been provided. Existing risk scores and behavioral signals are excluded.'
      : `Supported positive indicators: ${analysis.positive.filter(item => item.status === 'observed').length}. Answer-content concerns: ${analysis.observed.length}. Evaluated review criteria: ${analysis.assessed} of 4. Follow-up review is required to interpret any concern. This is not a probability of dishonesty or a hiring recommendation.`,
    signals: analysis.negative.map(item => ({ id: item.criterion, label: item.label, category: 'content', score: item.status === 'observed' ? 100 : 0, weight: .25, description: `${item.status === 'not_evaluated' ? 'Not evaluated. ' : ''}${item.explanation}` })),
    factors: analysis.observed.map(item => ({ id: item.criterion, feature: item.label, contribution: 25, detail: item.explanation })),
    events: analysis.observed.map(item => ({ id: item.criterion, timestampSec: item.evidence[0].timestampSec, type: 'answer', severity: 'medium', title: item.label, description: item.explanation, transcript: item.evidence.map(ref => ref.detail).join('\n') })),
    recommendation: {
      action: 'manual_review',
      rationale: analysis.observed.length ? 'Review the cited answers and ask targeted follow-up questions. A content concern does not establish unauthorized assistance or dishonesty.' : 'Review evidence coverage before drawing conclusions. Missing observations are not evidence that an interview is clear or problematic.',
      nextSteps: ['Review positive answer evidence alongside content concerns.', 'Verify possible external assistance separately against the interview rules.', 'Do not use gaze, pauses, nervousness, or uneven delivery as evidence of fraud.'],
    },
  }
}

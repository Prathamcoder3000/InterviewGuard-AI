import type { AnalyzeResponse } from '../components/interview-guard/api'

export interface CandidateEvaluation {
  id: string
  name: string
  role: string
  experienceLevel: string
  skills: string[]
  evaluatedAt: string
  answers: { question: string; answer: string }[]
  analysis: AnalyzeResponse
}

export const assessmentLabels = {
  demonstrated: 'Demonstrated', partial: 'Partial',
  not_demonstrated: 'Not demonstrated', insufficient_evidence: 'Not evaluated',
} as const
export type Assessment = keyof typeof assessmentLabels

// Count every claimed skill once. Missing or unknown assessments remain unassessed.
export function skillDistribution(candidate: CandidateEvaluation): Record<Assessment, number> {
  const counts = { demonstrated: 0, partial: 0, not_demonstrated: 0, insufficient_evidence: 0 }
  const skills = [...new Set(candidate.skills.map(skill => skill.trim().toLowerCase()).filter(Boolean))]
  for (const skill of skills) {
    const assessment = candidate.analysis.skill_analysis.find(item => item.skill.trim().toLowerCase() === skill)?.assessment
    const key = assessment && Object.hasOwn(assessmentLabels, assessment) ? assessment as Assessment : 'insufficient_evidence'
    counts[key]++
  }
  return counts
}

export function reviewScore(candidate: CandidateEvaluation): number | null {
  const value = candidate.analysis.risk_score
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
}

export function upsertEvaluation(candidates: CandidateEvaluation[], candidate: CandidateEvaluation) {
  return [candidate, ...candidates.filter(item => item.id !== candidate.id)]
}

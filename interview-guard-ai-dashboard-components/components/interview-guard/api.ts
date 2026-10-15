import type { InterviewRiskResult, RiskLevel } from './types'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface ParsedResume {
  name: string | null
  email: string | null
  phone: string | null
  education: { institution: string; degree: string; field: string; period: string }[]
  skills: string[]
  programming_languages: string[]
  experience: { company: string; title: string; period: string; description: string }[]
  projects: { name: string; description: string; technologies: string[] }[]
  links: string[]
  certifications: string[]
  achievements: string[]
}

export interface ParseResumeResponse {
  status: 'success' | 'partial' | 'failed'
  data: ParsedResume
  warnings: string[]
  method: string
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) return body.detail.map((d: { msg: string }) => d.msg).join('; ')
  } catch {}
  return `Request failed (${res.status})`
}

export async function parseResume(file: File): Promise<ParseResumeResponse> {
  const form = new FormData()
  form.append('file', file)
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/parse-resume`, { method: 'POST', body: form })
  } catch {
    throw new Error('Cannot reach the backend. Make sure the API server is running.')
  }
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export interface AnalyzePayload {
  candidate_id: string
  candidate_name: string
  claimed_skills: string[]
  experience_level: string
  applied_role?: string
  portfolio_url?: string
  resume_projects: string[]
  resume_experience: string[]
  interview_qa: { question: string; answer: string }[]
}

export interface AnalyzeResponse {
  candidate_id: string
  risk_score: number | null
  risk_level: string
  status: string
  is_mock: boolean
  reasons: string[]
  skill_analysis: { skill: string; assessment: string; evidence: string; confidence?: number }[]
  next_action: string
  limitations: string[]
}

export async function analyzeCandidate(payload: AnalyzePayload): Promise<AnalyzeResponse> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Cannot reach the backend. Make sure the API server is running.')
  }
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

const ASSESS_SCORE: Record<string, number> = {
  demonstrated: 10,
  partial: 50,
  not_demonstrated: 90,
  insufficient_evidence: 40,
}

/** Adapts the backend analysis response to the dashboard's result shape. */
export function toRiskResult(r: AnalyzeResponse, name: string, role: string): InterviewRiskResult {
  const level: RiskLevel =
    r.risk_level === 'high' ? 'high' : r.risk_level === 'medium' ? 'medium' : 'low'
  const n = Math.max(r.skill_analysis.length, 1)
  return {
    sessionId: r.candidate_id,
    candidate: { name, role: role || 'Candidate' },
    interviewer: 'InterviewGuard AI',
    conductedAt: new Date().toISOString(),
    durationSec: 0,
    overallScore: r.risk_score ?? 0,
    riskLevel: level,
    confidence: r.risk_score == null ? 0.3 : 0.8,
    baseScore: 0,
    modelVersion: r.is_mock ? 'mock' : 'gemini-2.5-flash',
    summary:
      r.risk_score == null
        ? 'There was not enough interview evidence to score this candidate. ' + r.reasons.join(' ')
        : r.reasons.join(' '),
    signals: r.skill_analysis.map((s, i) => ({
      id: `skill-${i}`,
      label: `${s.skill}: ${s.assessment.replace(/_/g, ' ')}`,
      category: 'content' as const,
      score: ASSESS_SCORE[s.assessment] ?? 40,
      weight: 1 / n,
      description: s.evidence,
    })),
    factors: [],
    events: [],
    recommendation: {
      action: level === 'high' ? 'manual_review' : level === 'medium' ? 'manual_review' : 'proceed',
      rationale: r.next_action,
      nextSteps: r.limitations,
    },
  }
}

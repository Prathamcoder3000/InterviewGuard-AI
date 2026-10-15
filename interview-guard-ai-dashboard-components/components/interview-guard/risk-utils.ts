import type { EvidenceType, RiskLevel, SignalCategory } from './types'

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

interface RiskStyle {
  label: string
  text: string
  softBg: string
  border: string
  solidBg: string
  stroke: string
  dot: string
}

export const riskStyles: Record<RiskLevel, RiskStyle> = {
  low: {
    label: 'Low risk',
    text: 'text-emerald-700',
    softBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    solidBg: 'bg-emerald-500',
    stroke: 'stroke-emerald-500',
    dot: 'bg-emerald-500',
  },
  medium: {
    label: 'Medium risk',
    text: 'text-amber-700',
    softBg: 'bg-amber-50',
    border: 'border-amber-200',
    solidBg: 'bg-amber-500',
    stroke: 'stroke-amber-500',
    dot: 'bg-amber-500',
  },
  high: {
    label: 'High risk',
    text: 'text-orange-700',
    softBg: 'bg-orange-50',
    border: 'border-orange-200',
    solidBg: 'bg-orange-500',
    stroke: 'stroke-orange-500',
    dot: 'bg-orange-500',
  },
  critical: {
    label: 'Critical risk',
    text: 'text-rose-700',
    softBg: 'bg-rose-50',
    border: 'border-rose-200',
    solidBg: 'bg-rose-600',
    stroke: 'stroke-rose-600',
    dot: 'bg-rose-600',
  },
}

export const categoryLabels: Record<SignalCategory, string> = {
  behavioral: 'Behavioral',
  audio: 'Audio',
  content: 'Content',
  environment: 'Environment',
}

export const evidenceTypeLabels: Record<EvidenceType, string> = {
  gaze: 'Off-screen gaze',
  audio: 'Secondary voice',
  ai_text: 'AI-like answer',
  tab_switch: 'Tab switch',
  face: 'Face anomaly',
  latency: 'Response latency',
}

export function formatTimestamp(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

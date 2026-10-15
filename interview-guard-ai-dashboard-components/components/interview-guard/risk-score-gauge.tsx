'use client'

import { ShieldAlert } from 'lucide-react'
import type { RiskLevel } from './types'
import { cx, riskStyles } from './risk-utils'

interface RiskScoreGaugeProps {
  score: number | null
  level: RiskLevel
  confidence: number
  modelVersion?: string
  className?: string
}

const ARC_LENGTH = Math.PI * 80
const THRESHOLDS = [35, 60, 80]

export function RiskScoreGauge({
  score,
  level,
  modelVersion,
  className,
}: RiskScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score ?? 0))
  const style = riskStyles[level]
  const offset = ARC_LENGTH * (1 - clamped / 100)

  return (
    <section
      aria-labelledby="risk-score-heading"
      className={cx(
        'flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="risk-score-heading" className="text-sm font-semibold text-slate-900">
          Answer review priority
        </h2>
        <span
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
            style.softBg,
            style.border,
            style.text,
          )}
        >
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          {score === null ? 'Not evaluated' : 'Review rubric'}
        </span>
      </div>

      {score === null ? <p className="py-8 text-center text-lg font-semibold text-slate-600">Not evaluated</p> : <div className="relative mx-auto w-full max-w-64">
        <svg
          viewBox="0 0 200 116"
          className="w-full"
          role="img"
          aria-label={`Answer review priority ${clamped} out of 100`}
        >
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            className="stroke-slate-100"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={offset}
            className={cx(style.stroke, 'transition-[stroke-dashoffset] duration-1000 ease-out')}
          />
          {THRESHOLDS.map((t) => {
            const angle = Math.PI * (1 - t / 100)
            const x1 = 100 + 68 * Math.cos(angle)
            const y1 = 100 - 68 * Math.sin(angle)
            const x2 = 100 + 92 * Math.cos(angle)
            const y2 = 100 - 92 * Math.sin(angle)
            return (
              <line
                key={t}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth="1.5"
                className="stroke-white"
              />
            )
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900">
            {clamped}
          </span>
          <span className="text-xs text-slate-500">out of 100</span>
        </div>
      </div>}
      <p className="text-sm leading-relaxed text-slate-600">25 review points per supported negative answer criterion. Unassessed criteria contribute no points, so an incomplete assessment is not a clear result. This index is not a fraud probability, a deepfake score, or a hiring recommendation.</p>

      <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-slate-500">Scoring scope</dt>
          <dd className="font-mono font-medium tabular-nums text-slate-900">
            Answer content only
          </dd>
        </div>
        {modelVersion && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-slate-500">Rubric version</dt>
            <dd className="font-mono font-medium text-slate-900">{modelVersion}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

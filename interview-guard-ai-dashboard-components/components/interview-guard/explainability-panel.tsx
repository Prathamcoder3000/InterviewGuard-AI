'use client'

import { useState } from 'react'
import { Info, TrendingDown, TrendingUp } from 'lucide-react'
import type { ExplanationFactor } from './types'
import { cx } from './risk-utils'

interface ExplainabilityPanelProps {
  factors: ExplanationFactor[]
  baseScore: number
  finalScore: number
  className?: string
}

export function ExplainabilityPanel({
  factors,
  baseScore,
  finalScore,
  className,
}: ExplainabilityPanelProps) {
  const sorted = [...factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.contribution)), 1)
  const [activeId, setActiveId] = useState<string | null>(sorted[0]?.id ?? null)
  const active = sorted.find((f) => f.id === activeId)

  return (
    <section
      aria-labelledby="explainability-heading"
      className={cx(
        'flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 id="explainability-heading" className="text-sm font-semibold text-slate-900">
          Why this score?
        </h2>
        <p className="text-sm text-slate-500">
          How much each factor raised or lowered the score, starting from the base rate. Select
          a factor for details.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500">Base rate</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">{baseScore}</span>
        </div>
        <div className="h-px flex-1 bg-slate-300" aria-hidden="true" />
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-500">Net change</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {finalScore - baseScore >= 0 ? '+' : ''}
            {finalScore - baseScore}
          </span>
        </div>
        <div className="h-px flex-1 bg-slate-300" aria-hidden="true" />
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500">Final score</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {finalScore}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1" aria-label="Contributing factors">
        {sorted.map((factor) => {
          const positive = factor.contribution >= 0
          const width = (Math.abs(factor.contribution) / maxAbs) * 100
          const isActive = factor.id === activeId
          return (
            <li key={factor.id}>
              <button
                type="button"
                onClick={() => setActiveId(factor.id)}
                aria-pressed={isActive}
                className={cx(
                  'grid w-full grid-cols-12 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                  isActive ? 'bg-blue-50' : 'hover:bg-slate-50',
                )}
              >
                <span className="col-span-12 truncate text-sm text-slate-800 sm:col-span-5">
                  {factor.feature}
                </span>
                <span className="col-span-10 flex h-5 items-center sm:col-span-6">
                  <span className="flex h-full w-1/2 justify-end">
                    {!positive && (
                      <span
                        className="h-full rounded-l-sm bg-emerald-500"
                        style={{ width: `${width}%` }}
                      />
                    )}
                  </span>
                  <span className="h-full w-px bg-slate-300" aria-hidden="true" />
                  <span className="flex h-full w-1/2">
                    {positive && (
                      <span
                        className="h-full rounded-r-sm bg-rose-500"
                        style={{ width: `${width}%` }}
                      />
                    )}
                  </span>
                </span>
                <span
                  className={cx(
                    'col-span-2 text-right font-mono text-sm font-semibold tabular-nums sm:col-span-1',
                    positive ? 'text-rose-700' : 'text-emerald-700',
                  )}
                >
                  {positive ? '+' : ''}
                  {factor.contribution}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <TrendingDown className="size-3.5 text-emerald-600" aria-hidden="true" />
          Lowers risk
        </span>
        <span className="flex items-center gap-1.5">
          Raises risk
          <TrendingUp className="size-3.5 text-rose-600" aria-hidden="true" />
        </span>
      </div>

      {active && (
        <div
          className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4"
          aria-live="polite"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-900">{active.feature}</p>
            <p className="text-pretty text-sm leading-relaxed text-slate-600">{active.detail}</p>
          </div>
        </div>
      )}
    </section>
  )
}

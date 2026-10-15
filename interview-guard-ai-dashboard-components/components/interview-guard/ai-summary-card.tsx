import { Sparkles } from 'lucide-react'
import type { EvidenceEvent, RiskSignal } from './types'
import { cx, riskStyles } from './risk-utils'

interface AiSummaryCardProps {
  summary: string
  signals: RiskSignal[]
  events: EvidenceEvent[]
  className?: string
}

export function AiSummaryCard({ summary, signals, events, className }: AiSummaryCardProps) {
  const flaggedSignals = signals.filter((s) => s.score >= 60).length
  const counts = {
    critical: events.filter((e) => e.severity === 'critical').length,
    high: events.filter((e) => e.severity === 'high').length,
    medium: events.filter((e) => e.severity === 'medium').length,
    low: events.filter((e) => e.severity === 'low').length,
  }

  return (
    <section
      aria-labelledby="ai-summary-heading"
      className={cx(
        'flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <h2 id="ai-summary-heading" className="text-sm font-semibold text-slate-900">
          AI assessment summary
        </h2>
      </div>

      <p className="text-pretty leading-relaxed text-slate-700">{summary}</p>

      <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {events.length} flagged events · {flaggedSignals} of {signals.length} signals above
            threshold
          </span>
        </div>
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
          role="img"
          aria-label={`Event severity: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low`}
        >
          {(['critical', 'high', 'medium', 'low'] as const).map((lvl) =>
            counts[lvl] > 0 ? (
              <div
                key={lvl}
                className={riskStyles[lvl].solidBg}
                style={{ width: `${(counts[lvl] / events.length) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {(['critical', 'high', 'medium', 'low'] as const).map((lvl) => (
            <li key={lvl} className="flex items-center gap-1.5">
              <span className={cx('size-2 rounded-full', riskStyles[lvl].dot)} aria-hidden="true" />
              <span className="capitalize">{lvl}</span>
              <span className="font-mono tabular-nums text-slate-900">{counts[lvl]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

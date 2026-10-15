import type { RiskSignal } from './types'
import { categoryLabels, cx, getRiskLevel, riskStyles } from './risk-utils'

interface SignalBreakdownProps {
  signals: RiskSignal[]
  className?: string
}

export function SignalBreakdown({ signals, className }: SignalBreakdownProps) {
  const sorted = [...signals].sort((a, b) => b.score - a.score)

  return (
    <section
      aria-labelledby="signal-breakdown-heading"
      className={cx(
        'flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 id="signal-breakdown-heading" className="text-sm font-semibold text-slate-900">
          Detection signals
        </h2>
        <p className="text-sm text-slate-500">
          Score for each detector, sorted by severity. Weight is how much the detector counts
          toward the final score.
        </p>
      </div>

      <ul className="flex flex-col gap-5">
        {sorted.map((signal) => {
          const level = getRiskLevel(signal.score)
          const style = riskStyles[level]
          return (
            <li key={signal.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium text-slate-900">{signal.label}</span>
                  <span className="text-xs text-slate-500">
                    {categoryLabels[signal.category]} · weight{' '}
                    <span className="font-mono tabular-nums">{signal.weight.toFixed(2)}</span>
                  </span>
                </div>
                <span
                  className={cx('font-mono text-sm font-semibold tabular-nums', style.text)}
                >
                  {signal.score}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={signal.score}
                aria-label={`${signal.label} score`}
              >
                <div
                  className={cx('h-full rounded-full', style.solidBg)}
                  style={{ width: `${signal.score}%` }}
                />
              </div>
              <p className="text-pretty text-xs leading-relaxed text-slate-600">
                {signal.description}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

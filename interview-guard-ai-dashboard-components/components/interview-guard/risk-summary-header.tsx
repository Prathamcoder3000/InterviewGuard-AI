import { CalendarDays, Clock, Download, UserRound } from 'lucide-react'
import type { InterviewRiskResult } from './types'
import { formatTimestamp } from './risk-utils'

interface RiskSummaryHeaderProps {
  result: InterviewRiskResult
  onExport?: () => void
}

export function RiskSummaryHeader({ result, onExport }: RiskSummaryHeaderProps) {
  const date = new Date(result.conductedAt)
  const formattedDate = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue-700">
          Risk results · {result.sessionId}
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          {result.candidate.name}
          <span className="font-normal text-slate-500">
            {' \u2014 '}
            {result.candidate.role}
          </span>
        </h1>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
          <li className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-slate-400" aria-hidden="true" />
            <time dateTime={result.conductedAt}>{formattedDate}</time>
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="size-4 text-slate-400" aria-hidden="true" />
            <span>{formatTimestamp(result.durationSec)} duration</span>
          </li>
          <li className="flex items-center gap-1.5">
            <UserRound className="size-4 text-slate-400" aria-hidden="true" />
            <span>Interviewer: {result.interviewer}</span>
          </li>
        </ul>
      </div>
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:self-auto"
        >
          <Download className="size-4" aria-hidden="true" />
          Export report
        </button>
      )}
    </header>
  )
}

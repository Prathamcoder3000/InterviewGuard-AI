'use client'

import type { InterviewRiskResult, ReviewerDecisionPayload } from './types'
import { RiskSummaryHeader } from './risk-summary-header'
import { RiskScoreGauge } from './risk-score-gauge'
import { AiSummaryCard } from './ai-summary-card'
import { SignalBreakdown } from './signal-breakdown'
import { ExplainabilityPanel } from './explainability-panel'
import { EvidenceTimeline } from './evidence-timeline'
import { RecommendationPanel } from './recommendation-panel'
import { cx } from './risk-utils'

export interface RiskResultsDashboardProps {
  result: InterviewRiskResult
  onDecision?: (payload: ReviewerDecisionPayload) => void | Promise<void>
  onSeek?: (timestampSec: number) => void
  onExport?: () => void
  className?: string
}

export function RiskResultsDashboard({
  result,
  onDecision,
  onSeek,
  onExport,
  className,
}: RiskResultsDashboardProps) {
  return (
    <div className={cx('w-full bg-slate-50 font-sans text-slate-900', className)}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <RiskSummaryHeader result={result} onExport={onExport} />

        <div className="grid gap-6 lg:grid-cols-12">
          <RiskScoreGauge
            className="lg:col-span-4"
            score={result.overallScore}
            level={result.riskLevel}
            confidence={result.confidence}
            modelVersion={result.modelVersion}
          />
          <AiSummaryCard
            className="lg:col-span-8"
            summary={result.summary}
            signals={result.signals}
            events={result.events}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <SignalBreakdown className="lg:col-span-5" signals={result.signals} />
          <ExplainabilityPanel
            className="lg:col-span-7"
            factors={result.factors}
            baseScore={result.baseScore}
            finalScore={result.overallScore}
          />
        </div>

        <EvidenceTimeline
          events={result.events}
          durationSec={result.durationSec}
          onSeek={onSeek}
        />

        <RecommendationPanel
          sessionId={result.sessionId}
          recommendation={result.recommendation}
          onDecision={onDecision}
        />
      </div>
    </div>
  )
}

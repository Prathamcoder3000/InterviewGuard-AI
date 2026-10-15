import type { evaluateAnalysis, AssessedFinding } from './analysis-policy'
import { formatTimestamp } from './risk-utils'

function Findings({ items, onSeek }: { items: AssessedFinding[]; onSeek?: (timestamp: number) => void }) {
  return <ul className="space-y-4">{items.map(item => <li key={item.criterion} className="border-t border-slate-100 pt-3">
    <p className="text-sm font-medium text-slate-900">{item.label}</p>
    <p className="mt-1 text-xs font-semibold text-slate-600">{item.status === 'observed' ? 'Observed · evidence linked' : item.status === 'not_observed' ? 'Not observed in reviewed evidence' : 'Not evaluated'}</p>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.explanation}</p>
    {item.evidence.map(ref => <details key={ref.id} className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600"><summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600">Evidence · {ref.source.replaceAll('_', ' ')} · {formatTimestamp(ref.timestampSec)}</summary><p className="mt-2 whitespace-pre-wrap leading-relaxed">{ref.detail}</p>{onSeek && <button type="button" onClick={() => onSeek(ref.timestampSec)} className="mt-2 rounded p-1 font-medium text-blue-700 underline focus-visible:outline-2 focus-visible:outline-blue-600">Jump to recording</button>}</details>)}
  </li>)}</ul>
}

export function AnalysisDimensions({ analysis, onSeek }: { analysis: ReturnType<typeof evaluateAnalysis>; onSeek?: (timestamp: number) => void }) {
  const dimensions = [
    { title: 'Positive analysis', subtitle: 'Evidence of relevant knowledge and independent explanation. These indicators do not certify honesty or identity.', items: analysis.positive, tone: 'text-emerald-700' },
    { title: 'Negative indicators', subtitle: 'Answer-content concerns for follow-up review. Technical gaps do not establish dishonesty.', items: analysis.negative, tone: 'text-amber-700' },
    { title: 'Possible external assistance', subtitle: 'Separate assessment. Possible reliance on external material requires verification; observations alone do not establish unauthorized assistance.', items: analysis.externalAssistance, tone: 'text-blue-700' },
  ]
  return <section aria-labelledby="dimensions-heading" className="space-y-5">
    <h2 id="dimensions-heading" className="text-lg font-semibold">Three analysis dimensions</h2>
    <div className="grid gap-6 xl:grid-cols-3">{dimensions.map(dimension => <section key={dimension.title} aria-label={dimension.title} className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className={`font-semibold ${dimension.tone}`}>{dimension.title}</h3><p className="my-3 text-sm leading-relaxed text-slate-600">{dimension.subtitle}</p><Findings items={dimension.items} onSeek={onSeek} /></section>)}</div>
    <section aria-label="Communication observations" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-semibold">Communication observations · excluded from scoring</h3><p className="my-3 text-sm leading-relaxed text-slate-600">Correct explanations remain positive evidence even with pauses or uneven delivery. Looking away, pauses, an unsteady speaking style, or self-reported nervousness do not establish dishonesty and never increase fraud or deepfake risk here. Emotional state is not inferred from video or voice. Fraud, deepfake, and identity detection: Not evaluated.</p><Findings items={analysis.communication} onSeek={onSeek} /></section>
  </section>
}

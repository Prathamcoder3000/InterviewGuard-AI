'use client'

import { useId, useState, type FormEvent } from 'react'
import { CheckCircle2, CircleAlert, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react'
import type {
  Recommendation,
  RecommendedAction,
  ReviewerDecision,
  ReviewerDecisionPayload,
} from './types'
import { cx } from './risk-utils'

interface RecommendationPanelProps {
  sessionId: string
  recommendation: Recommendation
  onDecision?: (payload: ReviewerDecisionPayload) => void | Promise<void>
  className?: string
}

const actionMeta: Record<
  RecommendedAction,
  { label: string; tone: string; icon: typeof ShieldCheck }
> = {
  proceed: { label: 'Proceed with candidate', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: ShieldCheck },
  manual_review: { label: 'Manual review required', tone: 'bg-amber-50 text-amber-800 border-amber-200', icon: TriangleAlert },
  reject: { label: 'Recommend rejection', tone: 'bg-rose-50 text-rose-800 border-rose-200', icon: ShieldX },
}

const decisions: Array<{ value: ReviewerDecision; label: string; description: string }> = [
  { value: 'confirm_flag', label: 'Record content concern', description: 'The cited answers require a targeted follow-up; this does not establish dishonesty.' },
  { value: 'escalate', label: 'Escalate', description: 'Send to the hiring committee for a second look.' },
  { value: 'clear_candidate', label: 'Resolve content concern', description: 'The follow-up or reviewed evidence resolves the concern.' },
]

export function RecommendationPanel({
  sessionId,
  recommendation,
  onDecision,
  className,
}: RecommendationPanelProps) {
  const noteId = useId()
  const [decision, setDecision] = useState<ReviewerDecision | null>(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const meta = actionMeta[recommendation.action]
  const ActionIcon = meta.icon

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!decision) return
    setStatus('submitting')
    try {
      await onDecision?.({ sessionId, decision, note: note.trim() })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      aria-labelledby="recommendation-heading"
      className={cx(
        'grid gap-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2',
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <h2 id="recommendation-heading" className="text-sm font-semibold text-slate-900">
          Recommended action
        </h2>
        <div className={cx('flex items-center gap-2 self-start rounded-lg border px-3 py-2', meta.tone)}>
          <ActionIcon className="size-4" aria-hidden="true" />
          <span className="text-sm font-semibold">{meta.label}</span>
        </div>
        <p className="text-pretty leading-relaxed text-slate-700">{recommendation.rationale}</p>
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Suggested next steps
          </h3>
          <ul className="flex flex-col gap-2">
            {recommendation.nextSteps.map((step) => (
              <li key={step} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg bg-slate-50 p-5"
        aria-label="Reviewer decision"
      >
        <fieldset className="flex flex-col gap-2" disabled={status === 'done'}>
          <legend className="mb-2 text-sm font-semibold text-slate-900">Reviewer decision</legend>
          {decisions.map((d) => (
            <label
              key={d.value}
              className={cx(
                'flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600',
                decision === d.value ? 'border-blue-600' : 'border-slate-200 hover:border-slate-300',
              )}
            >
              <input
                type="radio"
                name="decision"
                value={d.value}
                checked={decision === d.value}
                onChange={() => setDecision(d.value)}
                className="mt-0.5 size-4 accent-blue-600"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">{d.label}</span>
                <span className="text-xs text-slate-500">{d.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-medium text-slate-900">
            Note <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={status === 'done'}
            rows={3}
            maxLength={1000}
            placeholder="Add context for the hiring committee..."
            className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 disabled:opacity-60"
          />
        </div>

        {status === 'done' ? (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Decision recorded for {sessionId}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {status === 'error' && (
              <p role="alert" className="flex items-center gap-2 text-sm text-rose-700">
                <CircleAlert className="size-4" aria-hidden="true" />
                Couldn&apos;t save your decision. Please try again.
              </p>
            )}
            <button
              type="submit"
              disabled={!decision || status === 'submitting'}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit decision'}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}

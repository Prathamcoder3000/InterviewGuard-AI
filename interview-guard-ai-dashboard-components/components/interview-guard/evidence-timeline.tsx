'use client'

import { useState } from 'react'
import {
  AppWindow,
  Bot,
  Eye,
  Hourglass,
  Mic,
  ScanFace,
  type LucideIcon,
} from 'lucide-react'
import type { EvidenceEvent, EvidenceType } from './types'
import { cx, evidenceTypeLabels, formatPercent, formatTimestamp, riskStyles } from './risk-utils'

interface EvidenceTimelineProps {
  events: EvidenceEvent[]
  durationSec: number
  onSeek?: (timestampSec: number) => void
  className?: string
}

const typeIcons: Record<EvidenceType, LucideIcon> = {
  gaze: Eye,
  audio: Mic,
  ai_text: Bot,
  tab_switch: AppWindow,
  face: ScanFace,
  latency: Hourglass,
}

export function EvidenceTimeline({
  events,
  durationSec,
  onSeek,
  className,
}: EvidenceTimelineProps) {
  const sorted = [...events].sort((a, b) => a.timestampSec - b.timestampSec)
  const [selectedId, setSelectedId] = useState<string | null>(
    sorted.find((e) => e.severity === 'critical')?.id ?? sorted[0]?.id ?? null,
  )
  const selected = sorted.find((e) => e.id === selectedId)
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  const select = (event: EvidenceEvent) => {
    setSelectedId(event.id)
    onSeek?.(event.timestampSec)
  }

  return (
    <section
      aria-labelledby="evidence-heading"
      className={cx(
        'flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 id="evidence-heading" className="text-sm font-semibold text-slate-900">
          Evidence timeline
        </h2>
        <p className="text-sm text-slate-500">
          Every flagged moment, placed where it happened in the interview. Select a marker to
          see the evidence.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative h-14 rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-200">
          {sorted.map((event) =>
            event.durationSec ? (
              <span
                key={`${event.id}-span`}
                aria-hidden="true"
                className={cx(
                  'absolute inset-y-3 rounded-sm opacity-20',
                  riskStyles[event.severity].solidBg,
                )}
                style={{
                  left: `${(event.timestampSec / durationSec) * 100}%`,
                  width: `${(event.durationSec / durationSec) * 100}%`,
                }}
              />
            ) : null,
          )}
          {sorted.map((event) => {
            const left = (event.timestampSec / durationSec) * 100
            const style = riskStyles[event.severity]
            const isSelected = event.id === selectedId
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => select(event)}
                aria-label={`${event.title} at ${formatTimestamp(event.timestampSec)}, ${event.severity} severity`}
                aria-pressed={isSelected}
                className="group absolute inset-y-0 flex -translate-x-1/2 items-center px-1.5 focus-visible:outline-none"
                style={{ left: `${left}%` }}
              >
                <span
                  className={cx(
                    'block w-1.5 rounded-sm transition-all',
                    style.solidBg,
                    isSelected
                      ? 'h-12 ring-2 ring-slate-900 ring-offset-2 ring-offset-slate-50'
                      : 'h-8 opacity-80 group-hover:h-10 group-hover:opacity-100 group-focus-visible:ring-2 group-focus-visible:ring-blue-600',
                  )}
                />
              </button>
            )
          })}
        </div>
        <div className="flex justify-between font-mono text-xs tabular-nums text-slate-400">
          {ticks.map((t) => (
            <span key={t}>{formatTimestamp(durationSec * t)}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <ol className="flex flex-col gap-1 lg:col-span-2" aria-label="Flagged events">
          {sorted.map((event) => {
            const Icon = typeIcons[event.type]
            const style = riskStyles[event.severity]
            const isSelected = event.id === selectedId
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => select(event)}
                  aria-current={isSelected ? 'true' : undefined}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                    isSelected ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-50',
                  )}
                >
                  <span
                    className={cx(
                      'flex size-8 shrink-0 items-center justify-center rounded-md',
                      isSelected ? 'bg-white/10' : style.softBg,
                    )}
                  >
                    <Icon
                      className={cx('size-4', isSelected ? 'text-white' : style.text)}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{event.title}</span>
                    <span
                      className={cx(
                        'text-xs',
                        isSelected ? 'text-slate-300' : 'text-slate-500',
                      )}
                    >
                      {evidenceTypeLabels[event.type]}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'font-mono text-xs tabular-nums',
                      isSelected ? 'text-slate-300' : 'text-slate-500',
                    )}
                  >
                    {formatTimestamp(event.timestampSec)}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        {selected && <EvidenceDetail event={selected} onSeek={onSeek} />}
      </div>
    </section>
  )
}

function EvidenceDetail({
  event,
  onSeek,
}: {
  event: EvidenceEvent
  onSeek?: (timestampSec: number) => void
}) {
  const style = riskStyles[event.severity]
  const Icon = typeIcons[event.type]
  const end = event.durationSec ? event.timestampSec + event.durationSec : null

  return (
    <article
      aria-live="polite"
      className="flex flex-col gap-5 rounded-lg border border-slate-200 p-5 lg:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cx(
              'flex size-10 items-center justify-center rounded-lg',
              style.softBg,
            )}
          >
            <Icon className={cx('size-5', style.text)} aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-900">{event.title}</h3>
            <p className="font-mono text-xs tabular-nums text-slate-500">
              {formatTimestamp(event.timestampSec)}
              {end !== null && ` \u2013 ${formatTimestamp(end)}`}
            </p>
          </div>
        </div>
        <span
          className={cx(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
            style.softBg,
            style.border,
            style.text,
          )}
        >
          {event.severity}
        </span>
      </div>

      <p className="text-pretty leading-relaxed text-slate-700">{event.description}</p>

      {event.transcript && (
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Transcript excerpt
          </figcaption>
          <blockquote className="rounded-md bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-700">
            {event.transcript}
          </blockquote>
        </figure>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Detection confidence</span>
            <span className="font-mono font-medium tabular-nums text-slate-900">
              {formatPercent(event.confidence)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${event.confidence * 100}%` }}
            />
          </div>
        </div>
        {onSeek && (
          <button
            type="button"
            onClick={() => onSeek(event.timestampSec)}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Jump to recording
          </button>
        )}
      </div>
    </article>
  )
}

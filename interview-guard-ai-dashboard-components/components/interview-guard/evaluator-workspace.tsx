'use client'

import { useState } from 'react'
import { Users, Plus, Search, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { assessmentLabels, reviewScore, skillDistribution, type CandidateEvaluation, type Assessment } from '@/lib/candidate-evaluations'

const colors: Record<Assessment, string> = {
  demonstrated: 'bg-emerald-600', partial: 'bg-amber-500',
  not_demonstrated: 'bg-rose-600', insufficient_evidence: 'bg-slate-300',
}

export function CandidateAssessment({ candidate }: { candidate: CandidateEvaluation }) {
  const counts = skillDistribution(candidate)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const score = reviewScore(candidate)
  return <section aria-label={`Assessment for ${candidate.name}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h2 className="break-words text-2xl font-semibold text-slate-900">{candidate.name}</h2><p className="mt-1 break-words text-sm text-slate-600">{candidate.role || 'Role not specified'} · {candidate.experienceLevel} experience</p></div>
      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{candidate.analysis.is_mock ? 'Mock analysis · verify manually' : 'AI analysis · human review required'}</span>
    </div>
    <div className="my-6 grid gap-5 border-y border-slate-200 py-5 sm:grid-cols-3">
      <div><p className="text-sm text-slate-600">Technical review index</p><p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{score === null ? 'Not evaluated' : <>{score}<span className="text-base font-normal text-slate-500"> / 100</span></>}</p></div>
      <div><p className="text-sm text-slate-600">Skills with assessment evidence</p><p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{total - counts.insufficient_evidence}<span className="text-base font-normal text-slate-500"> / {total}</span></p></div>
      <div><p className="text-sm text-slate-600">Interview answers</p><p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{candidate.answers.length}</p></div>
    </div>
    <h3 className="font-semibold text-slate-900">Skill evidence breakdown</h3>
    <div role="img" aria-label={Object.entries(counts).map(([key, value]) => `${assessmentLabels[key as Assessment]}: ${value}`).join(', ')} className="my-4 flex h-7 overflow-hidden rounded-md bg-slate-100">
      {Object.entries(counts).map(([key, value]) => value > 0 && <div key={key} className={colors[key as Assessment]} style={{ width: `${value / total * 100}%` }} />)}
    </div>
    <ul className="mb-6 grid grid-cols-2 gap-3 text-sm text-slate-700">{Object.entries(counts).map(([key, value]) => <li key={key} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${colors[key as Assessment]}`} />{assessmentLabels[key as Assessment]} <strong className="ml-auto tabular-nums">{value}</strong></li>)}</ul>
    <p className="mb-6 max-w-prose text-sm leading-relaxed text-slate-600">Lower index values mean fewer technical consistency concerns. Backend weights: unsupported or unassessed skills up to 60 points, partial explanations up to 25, contradictions up to 15. Missing evidence can raise this index; it is not a proficiency score or hiring recommendation. Compare similar roles, skills and interview conditions.</p>
    <div className="divide-y divide-slate-200">{candidate.skills.map((skill, index) => {
      const item = candidate.analysis.skill_analysis.find(value => value.skill.trim().toLowerCase() === skill.trim().toLowerCase())
      const assessment = item && Object.hasOwn(assessmentLabels, item.assessment) ? item.assessment as Assessment : 'insufficient_evidence'
      return <div key={`${skill}-${index}`} className="py-4"><div className="flex flex-wrap justify-between gap-2"><h4 className="break-words font-medium text-slate-900">{skill}</h4><span className="text-sm text-slate-600">{assessmentLabels[assessment]}</span></div><p className="mt-1 break-words text-sm leading-relaxed text-slate-600">{item?.evidence || 'No interview evidence supplied for this skill.'}</p></div>
    })}</div>
    {candidate.analysis.reasons.length > 0 && <div className="mt-5"><h3 className="font-semibold text-slate-900">Review notes</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-700">{candidate.analysis.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul></div>}
    {candidate.analysis.limitations.length > 0 && <p className="mt-5 text-sm text-slate-600">Limitations: {candidate.analysis.limitations.join(' ')}</p>}
    <details className="mt-6 border-t border-slate-200 pt-4"><summary className="cursor-pointer font-medium text-slate-800">Read interview answers ({candidate.answers.length})</summary><ol className="mt-4 space-y-5">{candidate.answers.map((answer, i) => <li key={i}><h4 className="text-sm font-semibold text-slate-800">{answer.question}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{answer.answer}</p></li>)}</ol></details>
    <p className="mt-6 text-xs leading-relaxed text-slate-500">Face, gaze, nervousness, pauses and voice style have no contribution. External assistance is not evaluated by this text analysis.</p>
  </section>
}

export function EvaluatorWorkspace({ candidates, selectedId, onSelect, onAdd }: {
  candidates: CandidateEvaluation[]; selectedId: string | null; onSelect: (id: string) => void; onAdd: () => void
}) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [source, setSource] = useState('all')
  const [sort, setSort] = useState('recent')
  const visible = candidates.filter(candidate => `${candidate.name} ${candidate.skills.join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (!role || candidate.role === role) && (source === 'all' || candidate.analysis.is_mock === (source === 'mock')))
    .sort((a, b) => sort === 'score' ? (reviewScore(a) ?? Infinity) - (reviewScore(b) ?? Infinity) : b.evaluatedAt.localeCompare(a.evaluatedAt))
  const selected = visible.find(candidate => candidate.id === selectedId) ?? visible[0]
  const allCounts = visible.reduce((sum, candidate) => { const counts = skillDistribution(candidate); for (const key of Object.keys(sum) as Assessment[]) sum[key] += counts[key]; return sum }, { demonstrated: 0, partial: 0, not_demonstrated: 0, insufficient_evidence: 0 })
  const max = Math.max(1, ...Object.values(allCounts))
  const field = 'min-h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600'
  return <div className="mx-auto max-w-7xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Candidate evaluations</h1><p className="mt-2 text-sm text-slate-600">Review resume claims, compare answer evidence, and select a candidate to inspect.</p></div><Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={onAdd}><Plus /> Add candidate</Button></div>
    <p role="note" className="mt-4 text-xs text-slate-500">Session only: {candidates.length} evaluated {candidates.length === 1 ? 'candidate' : 'candidates'}. Switching tabs preserves results; refreshing or leaving this page clears them.</p>
    {!candidates.length ? <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Users className="mx-auto h-10 w-10 text-blue-600" /><h2 className="mt-4 text-xl font-semibold">Your next evaluation starts with a resume</h2><p className="mx-auto mb-6 mt-2 max-w-md text-sm leading-relaxed text-slate-600">Add a candidate, confirm their skills, and collect interview answers. Each completed analysis appears here with its own scores and evidence.</p><Button onClick={onAdd} className="bg-blue-600 text-white hover:bg-blue-700">Add first candidate</Button></section> : <>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">Search name or skill<input type="search" value={search} onChange={e => setSearch(e.target.value)} className={field} placeholder="Search candidates" /></label><label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">Applied role<select value={role} onChange={e => setRole(e.target.value)} className={field}><option value="">All roles</option>{[...new Set(candidates.map(c => c.role).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label><label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">Analysis source<select value={source} onChange={e => setSource(e.target.value)} className={field}><option value="all">All sources</option><option value="live">AI analysis</option><option value="mock">Mock analysis</option></select></label><label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">Sort candidates<select value={sort} onChange={e => setSort(e.target.value)} className={field}><option value="recent">Most recent</option><option value="score">Review index: low to high</option></select></label></div>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Evidence across {visible.length} matching candidates</h2><p className="mt-1 text-xs text-slate-500">Skill assessments, not candidate rankings. A candidate may contribute several skills.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(allCounts).map(([key, value]) => <div key={key}><div className="mb-1 flex justify-between text-sm text-slate-700"><span>{assessmentLabels[key as Assessment]}</span><strong className="tabular-nums">{value}</strong></div><div className="h-2 rounded bg-slate-100"><div className={`h-full rounded ${colors[key as Assessment]}`} style={{ width: `${value / max * 100}%` }} /></div></div>)}</div></section>
      {selected ? <div className="mt-6 grid items-start gap-6 lg:grid-cols-[310px_minmax(0,1fr)]"><section aria-label="Choose a candidate" className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Candidates ({visible.length})</h2><div className="max-h-[650px] overflow-y-auto">{visible.map(candidate => <button type="button" key={candidate.id} aria-pressed={selected.id === candidate.id} onClick={() => onSelect(candidate.id)} className={`w-full border-b border-slate-100 p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${selected.id === candidate.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-2"><span className="break-words font-semibold">{candidate.name}</span>{selected.id === candidate.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />}</div><p className="mt-1 break-words text-xs text-slate-600">{candidate.role || 'Role not specified'}</p><div className="mt-3 flex justify-between gap-2 text-xs text-slate-600"><span>{candidate.analysis.is_mock ? 'Mock' : 'AI'} · {candidate.skills.length} skills</span><span className="font-medium tabular-nums">Index: {reviewScore(candidate) ?? 'N/A'}</span></div></button>)}</div></section><CandidateAssessment candidate={selected} /></div> : <p role="status" className="py-12 text-center text-slate-600"><Search className="mx-auto mb-3 h-6 w-6" />No candidates match these filters. Change your search, role, or source.</p>}
    </>}
  </div>
}

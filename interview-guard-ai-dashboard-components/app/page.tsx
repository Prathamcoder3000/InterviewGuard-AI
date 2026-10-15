"use client"

import { useState } from 'react'
import Link from 'next/link'
import { CandidateIntake } from '@/components/interview-guard/candidate-intake'
import { EvaluatorWorkspace } from '@/components/interview-guard/evaluator-workspace'
import { RiskResultsDashboard, sampleRiskResult } from '@/components/interview-guard'
import { upsertEvaluation, type CandidateEvaluation } from '@/lib/candidate-evaluations'
import { Video, FileText, BarChart3, ShieldCheck, Users } from 'lucide-react'

export default function Page() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'intake' | 'demo'>('candidates')
  const [candidates, setCandidates] = useState<CandidateEvaluation[]>([])
  const [intakeVersion, setIntakeVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const tabs = [
    { id: 'candidates' as const, label: `Candidates (${candidates.length})`, icon: Users },
    { id: 'intake' as const, label: 'Resume & intake', icon: FileText },
    { id: 'demo' as const, label: 'Sample report', icon: BarChart3 },
  ]
  return <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><ShieldCheck className="h-5 w-5" /></span><div><p className="font-semibold">InterviewGuard AI</p><p className="text-xs text-slate-500">Evaluator workspace</p></div></div>
        <Link href="/interview" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"><Video className="h-4 w-4" />Interview studio</Link>
      </div>
      <nav aria-label="Evaluation navigation" className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 sm:px-6 lg:px-8">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)} className={`flex min-h-11 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${activeTab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
    </header>
    <main>
      {activeTab === 'candidates' && <EvaluatorWorkspace candidates={candidates} selectedId={selectedId} onSelect={setSelectedId} onAdd={() => { setIntakeVersion(value => value + 1); setActiveTab('intake') }} />}
      <div hidden={activeTab !== 'intake'}><CandidateIntake key={intakeVersion} onEvaluated={candidate => { setCandidates(current => upsertEvaluation(current, candidate)); setSelectedId(candidate.id) }} onViewCandidates={() => setActiveTab('candidates')} /></div>
      {activeTab === 'demo' && <><p role="note" className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm text-blue-800">Fictional sample report. These results are separate from your candidate list and its technical review index.</p><RiskResultsDashboard result={sampleRiskResult} /></>}
    </main>
  </div>
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CandidateIntake } from '@/components/interview-guard/candidate-intake'
import { RiskResultsDashboard, sampleRiskResult } from '@/components/interview-guard'
import { Video, FileText, BarChart3, ShieldCheck } from 'lucide-react'

export default function Page() {
  const [activeTab, setActiveTab] = useState<'intake' | 'demo'>('intake')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar integrating Intake, Demo Dashboard, and Webcam Recorder */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900">InterviewGuard AI</span>
              <span className="ml-2 hidden rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 sm:inline">
                Evaluation & Screening
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Mode Tabs */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('intake')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  activeTab === 'intake'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Resume & Intake</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('demo')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  activeTab === 'demo'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Sample Report</span>
              </button>
            </div>

            {/* Recorder link */}
            <Link
              href="/interview"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Record Interview</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {activeTab === 'intake' ? (
          <CandidateIntake />
        ) : (
          <div>
            <div className="bg-blue-50/70 border-b border-blue-100 px-4 py-2.5 text-center text-xs text-blue-800">
              Viewing demo risk results with sample technical evidence data.{' '}
              <button
                type="button"
                onClick={() => setActiveTab('intake')}
                className="font-semibold underline underline-offset-2 hover:text-blue-900"
              >
                Switch to Resume & Candidate Intake
              </button>
              {' '}or{' '}
              <Link href="/interview" className="font-semibold underline underline-offset-2 hover:text-blue-900">
                Record an interview via webcam
              </Link>.
            </div>
            <RiskResultsDashboard result={sampleRiskResult} />
          </div>
        )}
      </main>
    </div>
  )
}

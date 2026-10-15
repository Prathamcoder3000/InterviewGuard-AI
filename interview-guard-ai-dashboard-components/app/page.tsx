import { RiskResultsDashboard, sampleRiskResult } from '@/components/interview-guard'
import Link from 'next/link'

export default function Page() {
  return (
    <main>
      <div className="bg-slate-50 px-4 pt-6 text-center text-sm text-slate-700">
        Demo results — sample data, not analysis of a recorded session.{' '}
        <Link href="/interview" className="font-medium text-blue-700 underline underline-offset-4">Record an interview</Link>
      </div>
      <RiskResultsDashboard result={sampleRiskResult} />
    </main>
  )
}

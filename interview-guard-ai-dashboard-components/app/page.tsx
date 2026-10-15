import { RiskResultsDashboard, sampleRiskResult } from '@/components/interview-guard'

export default function Page() {
  return (
    <main>
      <RiskResultsDashboard result={sampleRiskResult} />
    </main>
  )
}

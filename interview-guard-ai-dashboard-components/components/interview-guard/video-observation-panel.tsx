'use client'

import { useState } from 'react'
import type { RefObject } from 'react'
import { ScanFace } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaceAnalysis } from '@/hooks/use-face-analysis'

const comparisonLabels = {
  not_evaluated: 'Not evaluated',
  within_demo_range: 'Within demo similarity range',
  inconclusive: 'Inconclusive similarity',
  outside_demo_range: 'Outside demo similarity range',
}

export function VideoObservationPanel({ videoRef, stream }: { videoRef: RefObject<HTMLVideoElement | null>; stream: MediaStream | null }) {
  const analysis = useFaceAnalysis(videoRef, stream)
  const [consent, setConsent] = useState(false)
  const observation = analysis.observation
  return <section aria-labelledby="face-observation-heading" className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 id="face-observation-heading" className="flex items-center gap-2 font-semibold"><ScanFace className="size-5 text-blue-700" aria-hidden="true" />Local face analysis</h2>
    <p className="text-sm leading-relaxed text-slate-600">Face count, approximate head orientation, and comparison with a consented reference photo. All processing stays in this browser; no photo, video, or face template is uploaded.</p>
    <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700"><input type="checkbox" className="mt-1 size-4 accent-blue-600" checked={consent} disabled={analysis.enabled} onChange={event => setConsent(event.target.checked)} /><span>I consent to local processing of my face and comparison with a reference photo I am authorized to use.</span></label>
    <div className="flex flex-wrap gap-2">
      {!analysis.enabled ? <Button onClick={analysis.start} disabled={!consent} className="bg-blue-600 text-white hover:bg-blue-700">Enable face analysis</Button> : <Button variant="interview-outline" onClick={analysis.stop}>Stop analysis & clear reference</Button>}
    </div>
    <p role="status" className="text-sm text-slate-600">{analysis.status === 'loading' ? 'Loading local face models… Recording remains available.' : analysis.status === 'unavailable' ? 'Analysis unavailable · recording still works.' : analysis.status === 'running' ? !stream ? 'Models ready. You can prepare a reference photo now; enable the camera for live observations. Closing the camera clears the reference.' : 'Analysis active · samples about once per second while this page is visible.' : 'Face analysis is off. Camera access is controlled separately.'}</p>
    {analysis.status === 'running' && <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <label className="block space-y-2 text-sm font-medium"><span>Consented reference photo</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={analysis.referenceBusy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void analysis.setPhoto(file) }} className="block w-full min-w-0 rounded border border-slate-300 p-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600" /></label>
      <p role="status" className="text-xs leading-relaxed text-slate-600">{analysis.referenceBusy ? 'Checking the photo locally…' : analysis.referenceReady ? 'Reference ready in memory. The original photo is not retained.' : 'Choose a front-facing JPEG, PNG, or WebP under 8 MB with exactly one face.'}</p>
      {analysis.referenceReady && <Button variant="interview-outline" size="sm" onClick={analysis.clearReference}>Clear reference photo</Button>}
    </div>}
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Face presence</dt><dd className="text-right font-medium">{!observation ? 'Not evaluated' : observation.faceCount === 0 ? 'No face detected' : observation.faceCount === 1 ? 'One face detected' : `${observation.faceCount} faces detected`}</dd></div>
      <div><dt className="text-slate-500">Head orientation</dt><dd>{observation?.orientation ?? 'Not evaluated'}</dd></div>
      <div><dt className="text-slate-500">Reference-photo comparison</dt><dd>{comparisonLabels[observation?.comparison ?? 'not_evaluated']}</dd></div>
      {observation?.distance !== null && observation?.distance !== undefined && <div><dt className="text-slate-500">Embedding distance (lower is more similar)</dt><dd className="font-mono">{observation.distance.toFixed(3)}</dd></div>}
    </dl>
    {observation?.reason && <p className="text-sm leading-relaxed text-slate-600">{observation.reason}</p>}
    {analysis.error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{analysis.error}</p>}
    <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">Similarity is not verified identity. Lighting, pose, image quality, and demographic performance can affect results. A photo or replay may pass; liveness and deepfakes are not evaluated. These observations never change review scores or make hiring decisions.</p>
  </section>
}

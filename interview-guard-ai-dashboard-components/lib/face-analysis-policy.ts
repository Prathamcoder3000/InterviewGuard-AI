export type FaceComparison = 'not_evaluated' | 'within_demo_range' | 'inconclusive' | 'outside_demo_range'
export interface FaceObservation {
  faceCount: number
  orientation: string
  comparison: FaceComparison
  distance: number | null
  reason: string
}
export interface FaceCandidate {
  score: number
  width: number
  height: number
  yaw?: number
  pitch?: number
  roll?: number
}

export function faceQuality(face: FaceCandidate): boolean {
  return Number.isFinite(face.score) && face.score >= .7 && Number.isFinite(face.width) && Number.isFinite(face.height) && face.width >= 90 && face.height >= 90
    && [face.yaw, face.pitch, face.roll].every(value => value !== undefined && Number.isFinite(value) && Math.abs(value) <= 25)
}

export function compareDescriptors(reference: Float32Array, current: Float32Array): { comparison: FaceComparison; distance: number | null } {
  if (reference.length !== 128 || current.length !== 128 || !Array.from(reference).every(Number.isFinite) || !Array.from(current).every(Number.isFinite)
    || reference.every(value => value === 0) || current.every(value => value === 0)) return { comparison: 'not_evaluated', distance: null }
  const distance = Math.sqrt(reference.reduce((sum, value, index) => sum + (value - current[index]) ** 2, 0))
  // Conservative demo bands, not calibrated identity probabilities or decisions.
  return { distance, comparison: distance <= .5 ? 'within_demo_range' : distance >= .65 ? 'outside_demo_range' : 'inconclusive' }
}

export function describeFaces(faces: FaceCandidate[], hasReference: boolean): FaceObservation {
  const base: FaceObservation = { faceCount: faces.length, orientation: 'Not evaluated', comparison: 'not_evaluated', distance: null, reason: '' }
  if (faces.length !== 1) return { ...base, reason: faces.length ? 'Multiple faces detected. Comparison requires exactly one face.' : 'No face detected. Improve lighting and camera framing.' }
  const face = faces[0]
  const angle = [face.yaw, face.pitch, face.roll].every(value => value !== undefined && Number.isFinite(value))
  const orientation = !angle ? 'Not evaluated' : Math.abs(face.roll!) > 15 ? 'Head tilted (approximate)' : Math.abs(face.pitch!) > 20 ? 'Head angled up/down (approximate)' : Math.abs(face.yaw!) > 20 ? 'Head turned sideways (approximate)' : 'Roughly forward (approximate)'
  return { ...base, orientation, reason: !faceQuality(face) ? 'Comparison unavailable: face the camera, move closer, and improve lighting.' : !hasReference ? 'Add a consented reference photo to compare.' : 'Reference comparison is a demo observation and requires human verification.' }
}

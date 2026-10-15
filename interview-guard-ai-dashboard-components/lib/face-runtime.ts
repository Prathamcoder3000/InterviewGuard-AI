import { compareDescriptors, describeFaces, faceQuality } from './face-analysis-policy'

let loading: Promise<typeof import('@vladmandic/face-api')> | null = null

export function loadFaceRuntime() {
  if (!loading) loading = (async () => {
    // Browser entry is selected by Webpack. Never imported during SSR.
    const api = await import('@vladmandic/face-api')
    // The package bundles TFJS but its published declaration omits these APIs.
    const tf = api.tf as unknown as { setBackend(name: string): Promise<boolean>; ready(): Promise<void> }
    try { if (!await tf.setBackend('webgl')) throw new Error('WebGL unavailable'); await tf.ready() }
    catch { await tf.setBackend('cpu'); await tf.ready() }
    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri('/models/face'),
      api.nets.faceLandmark68TinyNet.loadFromUri('/models/face'),
      api.nets.faceRecognitionNet.loadFromUri('/models/face'),
    ])
    return api
  })().catch(error => { loading = null; throw error })
  return loading
}

export async function inspectFace(canvas: HTMLCanvasElement, reference: Float32Array | null) {
  const api = await loadFaceRuntime()
  const faces = await api.detectAllFaces(canvas, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: .5 })).withFaceLandmarks(true)
  const candidates = faces.map(face => ({ score: face.detection.score, width: face.detection.box.width, height: face.detection.box.height, ...face.angle }))
  const observation = describeFaces(candidates, Boolean(reference))
  if (faces.length === 1 && reference && faceQuality(candidates[0])) {
    const crops = await api.extractFaces(canvas, [faces[0].alignedRect])
    let descriptor: Float32Array | null = null
    try {
      descriptor = await api.computeFaceDescriptor(crops[0]) as Float32Array
      Object.assign(observation, compareDescriptors(reference, descriptor))
    } finally {
      descriptor?.fill(0)
      crops.forEach(crop => { crop.width = 0; crop.height = 0 })
    }
  }
  return observation
}

export async function referenceFromPhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) throw new Error('Choose a JPEG, PNG, or WebP photo smaller than 8 MB.')
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  try {
    if (bitmap.width * bitmap.height > 16_000_000 || !bitmap.width || !bitmap.height) throw new Error('Choose a photo no larger than 16 megapixels.')
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is unavailable in this browser.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const api = await loadFaceRuntime()
    const faces = await api.detectAllFaces(canvas, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: .5 })).withFaceLandmarks(true).withFaceDescriptors()
    try {
      if (faces.length !== 1) throw new Error('Reference photo must show exactly one face. Choose a different photo.')
      const face = faces[0]
      if (!faceQuality({ score: face.detection.score, width: face.detection.box.width, height: face.detection.box.height, ...face.angle })) throw new Error('Use a clear, well-lit reference photo with a larger face looking toward the camera.')
      return new Float32Array(face.descriptor)
    } finally { faces.forEach(face => face.descriptor.fill(0)) }
  } finally { bitmap.close(); canvas.width = 0; canvas.height = 0 }
}

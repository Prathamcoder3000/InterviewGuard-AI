import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = dirname(require.resolve('@vladmandic/face-api/package.json'))
const target = new URL('../public/models/face/', import.meta.url)
await mkdir(target, { recursive: true })
for (const model of ['tiny_face_detector_model', 'face_landmark_68_tiny_model', 'face_recognition_model']) {
  const manifest = `${model}-weights_manifest.json`
  await copyFile(join(root, 'model', manifest), new URL(manifest, target))
  const groups = JSON.parse(await readFile(join(root, 'model', manifest), 'utf8'))
  for (const group of groups) for (const file of group.paths) {
    if (file !== `${model}.bin`) throw new Error(`Unexpected model shard: ${file}`)
    await copyFile(join(root, 'model', file), new URL(file, target))
  }
}
await copyFile(join(root, 'LICENSE'), new URL('LICENSE.face-api', target))
console.log('Prepared local face detection, landmark, and comparison models.')

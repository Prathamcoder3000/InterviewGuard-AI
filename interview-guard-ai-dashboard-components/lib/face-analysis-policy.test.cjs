const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const vm = require('node:vm')
const context = { exports: {} }
const code = stripTypeScriptTypes(readFileSync(`${__dirname}/face-analysis-policy.ts`, 'utf8')).replaceAll('export ', '')
vm.runInNewContext(`${code}\nObject.assign(exports, { faceQuality, compareDescriptors, describeFaces })`, context)
const { faceQuality, compareDescriptors, describeFaces } = context.exports
const clearFace = { score: .95, width: 180, height: 180, yaw: 0, pitch: 0, roll: 0 }

test('zero/multiple faces abstain from identity comparison and orientation', () => {
  for (const faces of [[], [clearFace, clearFace]]) {
    const observation = describeFaces(faces, true)
    assert.equal(observation.faceCount, faces.length)
    assert.equal(observation.comparison, 'not_evaluated')
    assert.equal(observation.orientation, 'Not evaluated')
    assert.equal(observation.distance, null)
  }
})
test('one face reports approximate orientation without inferring traits', () => {
  assert.match(describeFaces([clearFace], false).orientation, /forward/)
  assert.match(describeFaces([{ ...clearFace, yaw: 35 }], false).orientation, /sideways/)
  assert.match(describeFaces([{ ...clearFace, roll: 30 }], false).orientation, /tilted/)
  assert.equal(describeFaces([{ ...clearFace, yaw: NaN }], true).orientation, 'Not evaluated')
})
test('poor-quality or strongly rotated faces cannot be compared', () => {
  assert.equal(faceQuality(clearFace), true)
  for (const change of [{ score: .4 }, { width: 20 }, { height: 30 }, { yaw: 40 }, { pitch: 40 }, { roll: 40 }, { yaw: undefined }, { score: NaN }]) assert.equal(faceQuality({ ...clearFace, ...change }), false)
})
test('similarity has an uncertainty band and returns no probability', () => {
  const reference = new Float32Array(128).fill(.1)
  const live = new Float32Array(reference)
  assert.equal(compareDescriptors(reference, live).comparison, 'within_demo_range')
  live[0] = reference[0] + .55
  assert.equal(compareDescriptors(reference, live).comparison, 'inconclusive')
  live[0] = reference[0] + .8
  assert.equal(compareDescriptors(reference, live).comparison, 'outside_demo_range')
  assert.equal('probability' in compareDescriptors(reference, live), false)
})
test('invalid descriptors abstain and comparison never mutates its inputs', () => {
  assert.equal(compareDescriptors(new Float32Array(0), new Float32Array(128)).comparison, 'not_evaluated')
  assert.equal(compareDescriptors(new Float32Array(128), new Float32Array(128)).comparison, 'not_evaluated')
  const reference = new Float32Array(128)
  reference[0] = NaN
  assert.equal(compareDescriptors(reference, new Float32Array(128)).distance, null)
  reference[0] = .25
  compareDescriptors(reference, new Float32Array(128))
  assert.equal(reference[0], .25)
})
test('face observations contain no scoring or hiring-decision fields', () => {
  const result = describeFaces([clearFace], true)
  for (const forbidden of ['risk', 'riskScore', 'fraud', 'deepfake', 'emotion', 'gender', 'age', 'decision', 'confidence']) assert.equal(forbidden in result, false)
})

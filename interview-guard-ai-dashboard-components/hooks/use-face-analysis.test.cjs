const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const vm = require('node:vm')
const flush = () => new Promise(resolve => setImmediate(resolve))

function setup({ deferredPhoto = false, failModels = false } = {}) {
  const slots = [], effects = [], timers = new Map(), listeners = new Map()
  let cursor = 0, modelLoads = 0, resolvePhoto, observations = 0
  const template = new Float32Array(128).fill(.2)
  const videoRef = { current: { readyState: 2, videoWidth: 640, videoHeight: 480 } }
  const stream = { getVideoTracks: () => [{ readyState: 'live' }] }
  let currentStream = stream
  const runtime = {
    loadFaceRuntime: async () => { modelLoads++; if (failModels) throw new Error('Missing model') },
    referenceFromPhoto: async () => deferredPhoto ? new Promise(resolve => { resolvePhoto = () => resolve(template) }) : template,
    inspectFace: async () => { observations++; return { faceCount: 1, comparison: 'not_evaluated', distance: null, orientation: 'forward', reason: '' } },
  }
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((dep, n) => dep !== old.deps[n])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  const document = { hidden: false, createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }) }) }
  const context = { exports: {}, testRuntime: runtime, Error, document, Promise, setTimeout: fn => { const id = timers.size + 1; timers.set(id, fn); return id }, clearTimeout: id => timers.delete(id), window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }, require: () => react }
  const source = stripTypeScriptTypes(readFileSync(`${__dirname}/use-face-analysis.ts`, 'utf8'))
    .replace("import { useEffect, useRef, useState } from 'react'", "const { useEffect, useRef, useState } = require('react')")
    .replaceAll("import('@/lib/face-runtime')", 'Promise.resolve(testRuntime)')
    .replace('export function useFaceAnalysis', 'exports.useFaceAnalysis = function useFaceAnalysis')
  vm.runInNewContext(source, context)
  function render() { cursor = 0; const result = context.exports.useFaceAnalysis(videoRef, currentStream); while (effects.length) effects.shift()(); return result }
  return { render, template, models: () => modelLoads, observations: () => observations, cameraOff: () => { currentStream = null }, resolvePhoto: () => resolvePhoto(), unmount: () => slots.forEach(slot => slot?.cleanup?.()), document }
}

test('models are lazy and are not loaded before explicit enable', async () => {
  const h = setup(); h.render(); await flush()
  assert.equal(h.models(), 0)
  h.render().start(); h.render(); await flush()
  assert.equal(h.models(), 1)
  assert.equal(h.render().status, 'running')
  h.unmount()
})
test('clearing reference zeroes the biometric template', async () => {
  const h = setup(); h.render().start(); h.render(); await flush()
  await h.render().setPhoto({})
  assert.equal(h.render().referenceReady, true)
  h.render().clearReference()
  assert.ok(h.template.every(value => value === 0))
  assert.equal(h.render().referenceReady, false)
  h.unmount()
})
test('camera close clears reference and stale observations', async () => {
  const h = setup(); h.render().start(); h.render(); await flush()
  await h.render().setPhoto({})
  h.cameraOff(); h.render()
  assert.ok(h.template.every(value => value === 0))
  assert.equal(h.render().referenceReady, false)
  assert.equal(h.render().observation, null)
  h.unmount()
})
test('late photo extraction cannot restore a reference after disabling', async () => {
  const h = setup({ deferredPhoto: true }); h.render().start(); h.render(); await flush()
  const pending = h.render().setPhoto({}); await flush()
  h.render().stop(); h.render()
  h.resolvePhoto(); await pending
  assert.equal(h.render().referenceReady, false)
  assert.ok(h.template.every(value => value === 0))
  h.unmount()
})
test('unmount erases reference templates', async () => {
  const h = setup(); h.render().start(); h.render(); await flush()
  await h.render().setPhoto({})
  h.unmount()
  assert.ok(h.template.every(value => value === 0))
})
test('model failure is recoverable without starting camera capture', async () => {
  const h = setup({ failModels: true }); h.render().start(); h.render(); await flush()
  assert.equal(h.render().status, 'unavailable')
  assert.match(h.render().error, /could not load/)
  assert.equal(h.observations(), 0)
  h.unmount()
})
test('hidden pages skip inference', async () => {
  const h = setup(); h.document.hidden = true
  h.render().start(); h.render(); await flush()
  assert.equal(h.observations(), 0)
  h.unmount()
})

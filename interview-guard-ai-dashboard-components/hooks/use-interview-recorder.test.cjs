// Dependency-free lifecycle tests: a small hook runner and browser media doubles.
// Run: node --test hooks/use-interview-recorder.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const { stripTypeScriptTypes } = require('node:module')

function setup({ permissionError, empty = false, pending = false, supported = true, secure = true, failFirstCodec = false, stopFails = false } = {}) {
  const slots = [], effects = [], revoked = [], completed = [], recorders = []
  let cursor = 0, resolvePermission, calls = 0, codecAttempts = 0
  const listeners = new Map()
  const tracks = ['video', 'audio'].map(kind => ({ kind, readyState: 'live', onended: null, stop() { this.readyState = 'ended' } }))
  const stream = { getTracks: () => tracks, getVideoTracks: () => [tracks[0]], getAudioTracks: () => [tracks[1]] }
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect(fn, deps) {
      const i = cursor++, old = slots[i]
      if (!old || deps.some((dep, n) => dep !== old.deps[n])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
    },
  }
  class Recorder {
    static isTypeSupported(type) { return supported && (type === 'video/webm' || (failFirstCodec && type.includes('vp9'))) }
    constructor(_, options) { if (failFirstCodec && codecAttempts++ === 0) throw new Error('Encoder unavailable'); this.mimeType = options.mimeType; this.state = 'inactive'; recorders.push(this) }
    start() { this.state = 'recording' }
    stop() { if (stopFails) throw new Error('Encoder stopped unexpectedly'); this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(empty ? [] : ['video and audio']) }); this.onstop?.() }) }
  }
  const window = { isSecureContext: secure, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name), setInterval: () => 1, clearInterval() {} }
  const context = {
    exports: {}, require: name => { assert.equal(name, 'react'); return react },
    window, navigator: { mediaDevices: { getUserMedia: async () => { calls++; if (permissionError) throw permissionError; if (pending) return new Promise(resolve => { resolvePermission = resolve }); return stream } } },
    MediaRecorder: Recorder, Blob, DOMException, Error, performance, Date,
    URL: { createObjectURL: () => 'blob:local-recording', revokeObjectURL: url => revoked.push(url) },
  }
  const source = readFileSync(`${__dirname}/use-interview-recorder.ts`, 'utf8')
  const executable = stripTypeScriptTypes(source)
    .replace("import { useEffect, useRef, useState } from 'react'", "const { useEffect, useRef, useState } = require('react')")
    .replace('export function useInterviewRecorder', 'exports.useInterviewRecorder = function useInterviewRecorder')
  vm.runInNewContext(executable, context)
  function render() { cursor = 0; const result = context.exports.useInterviewRecorder((...args) => completed.push(args)); while (effects.length) effects.shift()(); return result }
  return { render, tracks, recorders, revoked, completed, dispatch: (name, event = {}) => listeners.get(name)?.(event), calls: () => calls, resolve: () => resolvePermission(stream), unmount: () => slots.forEach(slot => slot?.cleanup?.()) }
}

test('records audio/video, prevents duplicate starts, completes and releases devices', async () => {
  const h = setup()
  await h.render().enable()
  let recorder = h.render()
  assert.equal(recorder.status, 'ready')
  recorder.start(); recorder.start()
  assert.equal(h.recorders.length, 1)
  recorder = h.render()
  assert.equal(recorder.status, 'recording')
  recorder.stop()
  await Promise.resolve()
  recorder = h.render()
  assert.equal(recorder.status, 'complete')
  assert.equal(recorder.metadata.mimeType, 'video/webm')
  assert.ok(recorder.metadata.fileSize > 0)
  assert.equal(h.completed.length, 1)
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
  recorder.retake()
  assert.equal(h.render().url, null)
  assert.deepEqual(h.revoked, ['blob:local-recording'])
  h.unmount()
})

test('cancel discards final asynchronous chunks', async () => {
  const h = setup()
  await h.render().enable()
  h.render().start()
  h.render().retake()
  await Promise.resolve()
  assert.equal(h.render().url, null)
  assert.equal(h.completed.length, 0)
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
  h.unmount()
})

test('permission failure is actionable', async () => {
  const h = setup({ permissionError: new DOMException('Denied', 'NotAllowedError') })
  await h.render().enable()
  assert.match(h.render().error, /permission was denied/)
  assert.equal(h.render().status, 'idle')
  h.unmount()
})

test('late permission resolution after cancellation releases acquired devices', async () => {
  const h = setup({ pending: true })
  const enabling = h.render().enable()
  h.render().disable()
  h.resolve()
  await enabling
  assert.equal(h.render().stream, null)
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
  h.unmount()
})

test('empty recording does not publish a playback URL', async () => {
  const h = setup({ empty: true })
  await h.render().enable()
  h.render().start(); h.render().stop()
  await Promise.resolve()
  assert.match(h.render().error, /empty/)
  assert.equal(h.render().url, null)
  assert.equal(h.completed.length, 0)
  h.unmount()
})

test('device disconnection finalizes an interrupted recording', async () => {
  const h = setup()
  await h.render().enable()
  h.render().start()
  h.tracks[0].onended()
  await Promise.resolve()
  assert.equal(h.render().metadata.status, 'interrupted')
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
  h.unmount()
  assert.deepEqual(h.revoked, ['blob:local-recording'])
})

test('unmount stops recording and suppresses completion', async () => {
  const h = setup()
  await h.render().enable()
  h.render().start()
  h.unmount()
  await Promise.resolve()
  assert.equal(h.completed.length, 0)
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
})

test('unsupported encoding does not request device access', async () => {
  const h = setup({ supported: false })
  await h.render().enable()
  assert.match(h.render().error, /No supported/)
  assert.equal(h.calls(), 0)
  h.unmount()
})

test('insecure origin does not request device access', async () => {
  const h = setup({ secure: false })
  await h.render().enable()
  assert.match(h.render().error, /HTTPS or localhost/)
  assert.equal(h.calls(), 0)
  h.unmount()
})

test('falls back when an advertised encoder cannot be constructed', async () => {
  const h = setup({ failFirstCodec: true })
  await h.render().enable()
  h.render().start()
  assert.equal(h.render().status, 'recording')
  assert.equal(h.recorders[0].mimeType, 'video/webm')
  h.unmount()
})

test('a stop failure still releases devices and permits retry', async () => {
  const h = setup({ stopFails: true })
  await h.render().enable()
  h.render().start()
  h.render().stop()
  assert.equal(h.render().status, 'idle')
  assert.match(h.render().error, /Encoder stopped/)
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
  h.unmount()
})

test('back/forward restoration never reuses a revoked recording URL', async () => {
  const h = setup()
  await h.render().enable()
  h.render().start(); h.render().stop()
  await Promise.resolve()
  assert.ok(h.render().url)
  h.dispatch('pagehide')
  h.dispatch('pageshow', { persisted: true })
  assert.equal(h.render().url, null)
  assert.equal(h.render().status, 'idle')
  assert.equal(h.render().metadata, null)
  assert.deepEqual(h.revoked, ['blob:local-recording'])
  h.unmount()
})

test('unmount releases devices even when the encoder refuses to stop', async () => {
  const h = setup({ stopFails: true })
  await h.render().enable()
  h.render().start()
  assert.doesNotThrow(() => h.unmount())
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
})

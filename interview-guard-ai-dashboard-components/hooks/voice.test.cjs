const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const vm = require('node:vm')
const flush = () => new Promise(resolve => setImmediate(resolve))

function setup({ pendingPermission = false, failTranscription = false, deferredTranscription = false, speechUnsupported = false } = {}) {
  const slots = [], effects = [], transcripts = [], utterances = []
  let cursor = 0, resolvePermission, resolveTranscription
  const tracks = [{ readyState: 'live', onended: null, stop() { this.readyState = 'ended' } }]
  const stream = { getTracks: () => tracks, getAudioTracks: () => tracks }
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((dep, n) => dep !== old.deps[n])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  class Recorder {
    static isTypeSupported(type) { return type === 'audio/webm' }
    constructor(_, options) { this.mimeType = options.mimeType; this.state = 'inactive' }
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['answer']) }); this.onstop?.() }) }
  }
  class Utterance { constructor(text) { this.text = text } }
  const synth = { getVoices: () => [], speak: utterance => { utterances.push(utterance); utterance.onstart?.() }, cancel: () => {} }
  const window = { isSecureContext: true, setTimeout: () => 1, clearTimeout() {}, addEventListener() {}, removeEventListener() {}, ...(!speechUnsupported ? { speechSynthesis: synth } : {}) }
  const transcribeAnswer = async () => {
    if (failTranscription) throw new Error('Quota reached')
    if (deferredTranscription) return new Promise(resolve => { resolveTranscription = () => resolve({ text: 'Spoken answer.' }) })
    return { text: 'Spoken answer.' }
  }
  function load(file, name) {
    const context = { exports: {}, require: () => react, transcribeAnswer, window, navigator: { mediaDevices: { getUserMedia: async () => pendingPermission ? new Promise(resolve => { resolvePermission = () => resolve(stream) }) : stream } }, MediaRecorder: Recorder, SpeechSynthesisUtterance: Utterance, Blob, DOMException, Error, AbortController }
    const source = stripTypeScriptTypes(readFileSync(`${__dirname}/${file}`, 'utf8'))
      .replace("import { useEffect, useRef, useState } from 'react'", "const { useEffect, useRef, useState } = require('react')")
      .replace("import { transcribeAnswer } from '@/lib/interviewer-api'", '')
      .replace(`export function ${name}`, `exports.${name} = function ${name}`)
    vm.runInNewContext(source, context)
    return (...args) => { cursor = 0; const result = context.exports[name](...args); while (effects.length) effects.shift()(); return result }
  }
  return { voice: () => load('use-voice-answer.ts', 'useVoiceAnswer'), speech: () => load('use-question-speech.ts', 'useQuestionSpeech'), transcripts, utterances, tracks, resolvePermission: () => resolvePermission(), resolveTranscription: () => resolveTranscription(), unmount: () => slots.forEach(slot => slot?.cleanup?.()) }
}

test('voice recording releases mic and publishes editable transcription', async () => {
  const h = setup(), hook = h.voice(), render = () => hook(text => h.transcripts.push(text))
  await render().start(); assert.equal(render().status, 'recording')
  render().stop(); await flush()
  assert.deepEqual(h.transcripts, ['Spoken answer.'])
  assert.ok(h.tracks.every(track => track.readyState === 'ended'))
  assert.equal(render().status, 'idle'); h.unmount()
})
test('cancel discards the recording without transcription', async () => {
  const h = setup(), hook = h.voice()
  await hook(text => h.transcripts.push(text)).start()
  hook(() => {}).cancel(); await flush()
  assert.equal(h.transcripts.length, 0)
  assert.ok(h.tracks.every(track => track.readyState === 'ended')); h.unmount()
})
test('late microphone permission after cancellation releases tracks', async () => {
  const h = setup({ pendingPermission: true }), hook = h.voice()
  const starting = hook(() => {}).start()
  hook(() => {}).cancel(); h.resolvePermission(); await starting
  assert.equal(hook(() => {}).status, 'idle')
  assert.ok(h.tracks.every(track => track.readyState === 'ended')); h.unmount()
})
test('transcription error leaves typing available', async () => {
  const h = setup({ failTranscription: true }), hook = h.voice()
  await hook(() => {}).start(); hook(() => {}).stop(); await flush()
  assert.match(hook(() => {}).error, /Quota reached/)
  assert.equal(hook(() => {}).status, 'idle'); h.unmount()
})
test('cancelled late transcription cannot repopulate cleared answers', async () => {
  const h = setup({ deferredTranscription: true }), hook = h.voice(), render = () => hook(text => h.transcripts.push(text))
  await render().start(); render().stop(); await flush()
  render().cancel(); h.resolveTranscription(); await flush()
  assert.equal(h.transcripts.length, 0); h.unmount()
})
test('speech playback can be stopped and is detached on unmount', () => {
  const h = setup(), render = h.speech()
  render().speak('Explain your API.')
  assert.equal(render().speaking, true)
  render().stop(); assert.equal(render().speaking, false)
  render().speak('Explain your tests.'); h.unmount()
  assert.equal(h.utterances[1].onend, null)
})
test('unsupported browser speech leaves question text as fallback', () => {
  const h = setup({ speechUnsupported: true }), render = h.speech()
  render().speak('Question')
  assert.match(render().error, /unavailable/)
  assert.equal(render().available, false); h.unmount()
})

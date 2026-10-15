const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const vm = require('node:vm')
const context = { exports: {} }
const source = stripTypeScriptTypes(readFileSync(`${__dirname}/analysis-policy.ts`, 'utf8')).replaceAll('export ', '')
vm.runInNewContext(`${source}\nexports.evaluateAnalysis = evaluateAnalysis; exports.applyAnalysisPolicy = applyAnalysisPolicy`, context)
const { evaluateAnalysis, applyAnalysisPolicy } = context.exports

function input() {
  return {
    evidence: [
      { id: 'answer', timestampSec: 10, source: 'transcript', detail: 'An answer or a claim, reviewed in context.' },
      { id: 'followup', timestampSec: 20, source: 'transcript', detail: 'A separate follow-up answer or claim.' },
      { id: 'video', timestampSec: 30, source: 'video', detail: 'Observable use of reference material.' },
      { id: 'proctor', timestampSec: 40, source: 'approved_proctoring', detail: 'A documented integrity observation.' },
    ], positive: [], negative: [], externalAssistance: [], communication: [],
    interviewRules: { notesProhibited: false, proctoringApproved: false },
  }
}
const finding = (criterion, overrides = {}) => ({ criterion, status: 'observed', explanation: 'Reviewed against the linked context.', evidenceIds: ['answer'], relatedEvidenceIds: ['followup'], ...overrides })

test('missing evidence is not a zero-risk clearance', () => {
  assert.equal(evaluateAnalysis().score, null)
  assert.equal(evaluateAnalysis(input()).assessed, 0)
})
test('all five positive indicators are available and do not certify honesty', () => {
  const data = input()
  data.positive = ['relevance', 'own_words', 'experience_consistency', 'follow_up', 'reasoning'].map(key => finding(key))
  const result = evaluateAnalysis(data)
  assert.equal(result.positive.filter(item => item.status === 'observed').length, 5)
  assert.equal(result.score, null)
})
test('only four answer-content concerns add review points', () => {
  const data = input()
  data.negative = ['contradiction', 'repeated_unrelated', 'experience_mismatch', 'cannot_explain_material'].map(key => finding(key))
  assert.equal(evaluateAnalysis(data).score, 100)
  data.negative = data.negative.slice(0, 1)
  assert.equal(evaluateAnalysis(data).score, 25)
})
test('pauses, uneven delivery, gaze and nervousness never raise the score', () => {
  const data = input()
  data.negative = [finding('contradiction')]
  data.communication = ['frequent_pauses', 'uneven_pace', 'unsteady_delivery', 'self_reported_nervousness'].map(key => finding(key))
  data.negative.push(finding('gaze'), finding('latency'), finding('nervousness'), finding('ai_similarity'), finding('face'))
  assert.equal(evaluateAnalysis(data).score, 25)
  data.negative = []
  assert.equal(evaluateAnalysis(data).score, null)
})
test('positive correctness remains visible alongside uneven delivery', () => {
  const data = input()
  data.positive = [finding('reasoning')]
  data.communication = [finding('uneven_pace')]
  assert.equal(evaluateAnalysis(data).positive.find(item => item.criterion === 'reasoning').status, 'observed')
  assert.equal(evaluateAnalysis(data).score, null)
})
test('unsupported, missing, duplicate or identical comparison evidence cannot score', () => {
  const data = input()
  for (const item of [finding('contradiction', { relatedEvidenceIds: [] }), finding('contradiction', { relatedEvidenceIds: ['answer'] }), finding('contradiction', { evidenceIds: ['missing'] }), finding('contradiction', { evidenceIds: ['video'] })]) {
    data.negative = [item]
    assert.equal(evaluateAnalysis(data).score, null)
  }
  data.negative = [finding('contradiction'), finding('contradiction')]
  assert.equal(evaluateAnalysis(data).score, null)
})
test('external assistance requires appropriate evidence and stays separate', () => {
  const data = input()
  data.externalAssistance = [finding('visible_device', { evidenceIds: ['answer'], relatedEvidenceIds: [] })]
  assert.equal(evaluateAnalysis(data).externalAssistance[0].status, 'not_evaluated')
  data.externalAssistance[0].evidenceIds = ['video']
  assert.equal(evaluateAnalysis(data).externalAssistance[0].status, 'observed')
  assert.equal(evaluateAnalysis(data).score, null)
})
test('notes and proctor evidence require an explicit interview policy', () => {
  const data = input()
  data.externalAssistance = [finding('prohibited_notes', { evidenceIds: ['video'], relatedEvidenceIds: [] }), finding('approved_proctoring', { evidenceIds: ['proctor'], relatedEvidenceIds: [] })]
  assert.equal(evaluateAnalysis(data).externalAssistance.filter(item => item.status === 'observed').length, 0)
  data.interviewRules = { notesProhibited: true, proctoringApproved: true }
  assert.equal(evaluateAnalysis(data).externalAssistance.filter(item => item.status === 'observed').length, 2)
  assert.equal(evaluateAnalysis(data).score, null)
})
test('repeated supplied material alone cannot establish external reliance', () => {
  const data = input()
  data.externalAssistance = [finding('material_with_failed_follow_up', { relatedEvidenceIds: [] })]
  assert.equal(evaluateAnalysis(data).externalAssistance[2].status, 'not_evaluated')
})
test('dashboard boundary discards legacy scores, claims and rejection recommendations', () => {
  const result = applyAnalysisPolicy({ overallScore: 99, summary: 'Gaze proves cheating', signals: [{ id: 'gaze', score: 99 }], factors: [], events: [], recommendation: { action: 'reject' } })
  assert.equal(result.overallScore, 0)
  assert.match(result.summary, /Not evaluated/)
  assert.equal(result.events.length, 0)
  assert.equal(result.factors.length, 0)
  assert.equal(result.recommendation.action, 'manual_review')
  assert.equal(result.signals.some(item => item.id === 'gaze'), false)
})
test('the displayed score and factor sum agree without fabricated confidence', () => {
  const data = input()
  data.negative = [finding('contradiction')]
  const result = applyAnalysisPolicy({ analysisInput: data })
  assert.equal(result.overallScore, result.baseScore + result.factors.reduce((sum, item) => sum + item.contribution, 0))
  assert.equal(result.events[0].confidence, undefined)
  assert.equal(result.recommendation.action, 'manual_review')
})

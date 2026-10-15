'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Mic, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInterviewQuestion, type InterviewQuestion, type InterviewTurn } from '@/lib/interviewer-api'
import { useVoiceAnswer } from '@/hooks/use-voice-answer'
import { useQuestionSpeech } from '@/hooks/use-question-speech'

export function AiInterviewer() {
  const [resume, setResume] = useState('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [readAloud, setReadAloud] = useState(true)
  const [history, setHistory] = useState<InterviewTurn[]>([])
  const [question, setQuestion] = useState<InterviewQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const speech = useQuestionSpeech()
  const voice = useVoiceAnswer(text => setAnswer(previous => [previous.trim(), text].filter(Boolean).join('\n').slice(0, 5000)))
  const voiceBusy = voice.status !== 'idle'

  useEffect(() => () => request.current?.abort(), [])
  async function advance() {
    if (request.current || voiceBusy || !consent) return
    if (question && !answer.trim()) { setError('Speak or type an answer before continuing.'); return }
    speech.stop()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    const nextHistory = question ? [...history, { question: question.question, answer: answer.trim() }] : history
    try {
      const next = await getInterviewQuestion(resume, role, nextHistory, controller.signal)
      if (controller.signal.aborted) return
      setHistory(nextHistory)
      setQuestion(next)
      setAnswer('')
      if (readAloud) speech.speak(next.question)
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'The interviewer is unavailable. Retry to continue.') }
    finally { if (request.current === controller) { request.current = null; setLoading(false) } }
  }
  function clear() {
    request.current?.abort(); request.current = null
    voice.cancel(); speech.stop()
    setLoading(false); setQuestion(null); setHistory([]); setAnswer(''); setResume(''); setRole(''); setConsent(false); setError('')
  }
  function finish() {
    request.current?.abort(); request.current = null
    voice.cancel(); speech.stop(); setLoading(false)
    if (question && answer.trim()) setHistory(previous => [...previous, { question: question.question, answer: answer.trim() }])
    setAnswer('')
    setQuestion({ question: 'Interview ended. You can download your submitted answers.', question_number: history.length, complete: true, provider: 'groq' })
  }
  function download() {
    const text = history.map((turn, index) => `${index + 1}. ${turn.question}\n\n${turn.answer}`).join('\n\n---\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const link = document.createElement('a'); link.href = url; link.download = 'interview-transcript.txt'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section aria-labelledby="ai-interviewer-heading" className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="ai-interviewer-heading" className="flex items-center gap-2 font-semibold"><Bot className="size-5 text-blue-700" aria-hidden="true" />AI interviewer</h2><span className="text-xs text-slate-500">Groq · resume-based · 5 questions</span></div>
    <p className="text-sm leading-relaxed text-slate-600">Practice with questions based on your resume and follow-ups based on your answers. Video recording and face observations remain separate.</p>
    {!question && <div className="space-y-4">
      <label className="block space-y-2 text-sm font-medium"><span>Target role (optional)</span><input value={role} onChange={event => setRole(event.target.value)} maxLength={150} disabled={loading} placeholder="For example: Backend Engineer" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600" /></label>
      <label className="block space-y-2 text-sm font-medium"><span>Resume text</span><textarea value={resume} onChange={event => setResume(event.target.value)} disabled={loading} maxLength={16000} rows={6} placeholder="Paste your resume’s skills, projects, experience, and education. Remove contact details you do not want to share." className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600" /></label>
      <label className="block space-y-2 text-xs text-slate-600"><span>Or load a plain-text resume (.txt, up to 16,000 characters)</span><input type="file" accept=".txt,text/plain" disabled={loading} className="block w-full min-w-0 rounded border border-slate-300 p-2" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > 128000) { setError('Choose a smaller plain-text resume, or paste its text.'); return } const text = await file.text(); if (text.length > 16000) { setError('Resume text exceeds 16,000 characters. Paste a shorter version.'); return } setResume(text); setError('') }} /></label>
      <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700"><input type="checkbox" checked={consent} disabled={loading} onChange={event => setConsent(event.target.checked)} className="mt-1 size-4 accent-blue-600" /><span>I consent to sending my resume text, submitted answers, and separately recorded voice answers to Groq for questions and transcription. The full video recording and reference photo stay local. Questions are read using browser/device speech.</span></label>
    </div>}
    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={readAloud} onChange={event => { setReadAloud(event.target.checked); if (!event.target.checked) speech.stop() }} className="size-4 accent-blue-600" />Read questions aloud</label>
    {question && <div className="space-y-3 rounded-lg border border-blue-100 bg-white p-4"><p className="text-xs font-medium text-blue-700">{question.complete ? 'Interview complete' : `Question ${question.question_number} of 5`}</p><p className="text-base font-medium leading-relaxed text-slate-900">{question.question}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="interview-outline" disabled={!speech.available || voiceBusy} onClick={() => speech.speaking ? speech.stop() : speech.speak(question.question)}><Volume2 aria-hidden="true" />{speech.speaking ? 'Stop question audio' : 'Read question again'}</Button></div></div>}
    {question && !question.complete && <div className="space-y-3">
      <label className="block space-y-2 text-sm font-medium"><span>Your answer · editable transcript</span><textarea rows={5} maxLength={5000} value={answer} onChange={event => setAnswer(event.target.value)} disabled={loading} placeholder="Type your answer, or record a voice answer below. Review the transcript before submitting." className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600" /></label>
      <div className="flex flex-wrap gap-2">
        {voice.status === 'idle' && <Button variant="interview-outline" disabled={loading} onClick={() => { speech.stop(); void voice.start() }}><Mic aria-hidden="true" />Record voice answer</Button>}
        {voice.status === 'recording' && <Button variant="interview-outline" onClick={voice.stop}><Square aria-hidden="true" />Stop & transcribe</Button>}
        {voiceBusy && <Button variant="interview-outline" onClick={voice.cancel}>Cancel voice answer</Button>}
      </div>
      <p role="status" className="text-xs leading-relaxed text-slate-600">{voice.status === 'requesting' ? 'Allow microphone access in your browser.' : voice.status === 'recording' ? 'Recording answer · maximum 2 minutes. Stop to send this audio to Groq for transcription.' : voice.status === 'transcribing' ? 'Transcribing with Groq… Your microphone has been released.' : 'English speech transcription. Use headphones to reduce feedback. Typing is always available.'}</p>
    </div>}
    {(error || voice.error || speech.error) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error || voice.error || speech.error}</p>}
    <div className="flex flex-wrap gap-2">
      {!question?.complete && <Button disabled={loading || voiceBusy || !consent || resume.trim().length < 30 || Boolean(question && !answer.trim())} onClick={() => void advance()} className="bg-blue-600 text-white hover:bg-blue-700">{loading ? 'Preparing question…' : !question ? 'Start AI interview' : question.question_number === 5 ? 'Submit final answer' : 'Submit answer & continue'}</Button>}
      {(question || loading) && !question?.complete && <Button variant="interview-outline" onClick={finish}>End interview</Button>}
      {history.length > 0 && <Button variant="interview-outline" onClick={download}>Download submitted answers</Button>}
      {(question || resume) && <Button variant="interview-outline" onClick={clear}>Clear interview</Button>}
    </div>
    {loading && <p role="status" className="text-sm text-slate-600">Waiting for the interviewer. Your answer is preserved if the request fails.</p>}
    {history.length > 0 && <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm"><summary className="cursor-pointer font-medium">Submitted answers ({history.length})</summary><ol className="mt-3 space-y-4">{history.map((turn, index) => <li key={index}><p className="font-medium">{index + 1}. {turn.question}</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{turn.answer}</p></li>)}</ol></details>}
  </section>
}

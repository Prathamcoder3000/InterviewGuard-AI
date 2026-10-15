export interface InterviewTurn { question: string; answer: string }
export interface InterviewQuestion { question: string; question_number: number; complete: boolean; provider: 'groq' }

async function post<T>(action: string, body: BodyInit, type: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/interview/${action}`, { method: 'POST', headers: { 'Content-Type': type }, body, signal })
  const data = await response.json()
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'The request was invalid. Check the resume and answer length and retry.')
  return data as T
}
export function getInterviewQuestion(resume: string, role: string, history: InterviewTurn[], signal: AbortSignal) {
  return post<InterviewQuestion>('question', JSON.stringify({ resume_text: resume, role: role || 'Role described in the resume', history }), 'application/json', signal)
}
export function transcribeAnswer(audio: Blob, signal: AbortSignal) {
  return post<{ text: string }>('transcribe', audio, audio.type || 'audio/webm', signal)
}

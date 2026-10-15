'use client'

import { useEffect, useRef, useState } from 'react'

export function useQuestionSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState('')
  const current = useRef<SpeechSynthesisUtterance | null>(null)
  function stop() {
    if (current.current) { current.current.onend = null; current.current.onerror = null; current.current = null }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }
  function speak(text: string) {
    stop()
    setError('')
    if (!('speechSynthesis' in window)) { setError('Speech playback is unavailable. Read the question on screen.'); return }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find(voice => voice.localService && voice.lang === 'en-IN') || voices.find(voice => voice.localService && voice.lang.startsWith('en')) || null
    utterance.onstart = () => { if (current.current === utterance) setSpeaking(true) }
    utterance.onend = () => { if (current.current === utterance) { setSpeaking(false); current.current = null } }
    utterance.onerror = () => { if (current.current === utterance) { setSpeaking(false); setError('Question audio could not play. Read it on screen or retry playback.'); current.current = null } }
    current.current = utterance
    window.speechSynthesis.speak(utterance)
  }
  useEffect(() => {
    setAvailable('speechSynthesis' in window)
    const close = () => {
      if (current.current) { current.current.onstart = null; current.current.onend = null; current.current.onerror = null; current.current = null }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
    window.addEventListener('pagehide', close)
    return () => { window.removeEventListener('pagehide', close); close() }
  }, [])
  return { speak, stop, speaking, available, error }
}

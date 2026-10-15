'use client'

import { useCallback, useRef, useState } from 'react'
import {
  analyzeCandidate,
  parseResume,
  type ParsedResume,
} from './api'
import type { CandidateEvaluation } from '@/lib/candidate-evaluations'
import { CandidateAssessment } from './evaluator-workspace'
import { Button } from '@/components/ui/button'

const MAX_BYTES = 5 * 1024 * 1024
const EXT_OK = /\.(pdf|docx)$/i

interface Profile {
  name: string
  email: string
  phone: string
  role: string
  experienceLevel: string
  education: ParsedResume['education']
  skills: string
  languages: string
  experience: ParsedResume['experience']
  projects: { name: string; description: string; technologies: string }[]
  links: string
  certifications: string
  achievements: string
}

const emptyProfile: Profile = {
  name: '', email: '', phone: '', role: '', experienceLevel: 'mid',
  education: [], skills: '', languages: '', experience: [], projects: [],
  links: '', certifications: '', achievements: '',
}

const splitList = (s: string) =>
  s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
const cardCls = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  )
}

export function CandidateIntake({ onEvaluated, onViewCandidates }: { onEvaluated: (candidate: CandidateEvaluation) => void; onViewCandidates: () => void }) {
  const [stage, setStage] = useState<'profile' | 'interview' | 'results'>('profile')
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<CandidateEvaluation | null>(null)
  const candidateId = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }))

  const handleFile = useCallback(async (file: File | undefined) => {
    setError(null)
    setSuccess(null)
    setWarnings([])
    if (!file) return
    if (!EXT_OK.test(file.name)) return setError('Unsupported file type. Please upload a PDF or DOCX file.')
    if (file.size === 0) return setError('The selected file is empty.')
    if (file.size > MAX_BYTES) return setError('File is larger than 5 MB.')
    setParsing(true)
    try {
      const res = await parseResume(file)
      const d = res.data
      setProfile((p) => ({
        ...p,
        name: d.name ?? '',
        email: d.email ?? '',
        phone: d.phone ?? '',
        education: d.education,
        skills: d.skills.join(', '),
        languages: d.programming_languages.join(', '),
        experience: d.experience,
        projects: d.projects.map((x) => ({ ...x, technologies: x.technologies.join(', ') })),
        links: d.links.join('\n'),
        certifications: d.certifications.join('\n'),
        achievements: d.achievements.join('\n'),
      }))
      setWarnings(res.warnings)
      setSuccess(
        res.status === 'success'
          ? 'Resume parsed. Please review and edit the fields below.'
          : 'Resume partially parsed. Please complete the missing fields below.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume parsing failed.')
    } finally {
      setParsing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [])

  // Skills, languages and project technologies, de-duplicated case-insensitively.
  const claimedSkills = () => {
    const seen = new Map<string, string>()
    const all = [
      ...splitList(profile.skills),
      ...splitList(profile.languages),
      ...profile.projects.flatMap((p) => splitList(p.technologies)),
    ]
    all.forEach((s) => {
      const key = s.toLowerCase()
      if (!seen.has(key)) seen.set(key, s)
    })
    return Array.from(seen.values()).slice(0, 50)
  }

  const startInterview = () => {
    setError(null)
    if (!profile.name.trim()) return setError('Candidate name is required.')
    if (claimedSkills().length === 0) return setError('Add at least one skill to verify.')
    const qs: string[] = []
    profile.projects.filter((p) => p.name.trim()).slice(0, 3).forEach((p) =>
      qs.push(
        `Walk me through your project "${p.name}"${p.technologies ? ` (${p.technologies})` : ''}. What was your role and which design decisions did you make?`,
      ),
    )
    profile.experience.filter((e) => e.company.trim() || e.title.trim()).slice(0, 2).forEach((e) =>
      qs.push(`Describe a technical challenge you solved as ${e.title || 'a team member'} at ${e.company || 'your previous role'}.`),
    )
    claimedSkills().slice(0, 4).forEach((s) =>
      qs.push(`Explain a concrete situation where you used ${s} and one limitation or trade-off you encountered.`),
    )
    setQuestions(qs)
    setAnswers(qs.map(() => ''))
    setStage('interview')
  }

  const submitInterview = async () => {
    setError(null)
    setAnalyzing(true)
    try {
      const qa = questions
        .map((question, i) => ({ question, answer: answers[i].trim() }))
        .filter((x) => x.answer)
      if (qa.length === 0) throw new Error('Answer at least one question before analysis.')
      const res = await analyzeCandidate({
        candidate_id: candidateId.current ?? (candidateId.current = crypto.randomUUID()),
        candidate_name: profile.name.trim(),
        claimed_skills: claimedSkills(),
        experience_level: profile.experienceLevel,
        applied_role: profile.role || undefined,
        portfolio_url: splitList(profile.links)[0],
        resume_projects: profile.projects
          .filter((p) => p.name.trim())
          .map((p) => `${p.name}: ${p.description} [${p.technologies}]`),
        resume_experience: profile.experience
          .filter((e) => e.company.trim() || e.title.trim())
          .map((e) => `${e.title} at ${e.company} (${e.period}): ${e.description}`),
        interview_qa: qa,
      })
      const evaluation: CandidateEvaluation = {
        id: res.candidate_id, name: profile.name.trim(), role: profile.role.trim(),
        experienceLevel: profile.experienceLevel, skills: claimedSkills(),
        evaluatedAt: new Date().toISOString(), answers: qa, analysis: res,
      }
      setResult(evaluation)
      onEvaluated(evaluation)
      setStage('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (stage === 'results' && result) {
    return <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap gap-3">
        <Button variant="interview-outline" onClick={onViewCandidates}>View all candidates</Button>
        <Button variant="interview-outline" onClick={() => setStage('profile')}>Edit this candidate</Button>
        <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => {
          setProfile(emptyProfile); setResult(null); setQuestions([]); setAnswers([]);
          setError(null); setWarnings([]); setSuccess(null); candidateId.current = null; setStage('profile')
        }}>Add another candidate</Button>
      </div>
      <p role="status" className="text-sm text-slate-600">Analysis saved to this session’s candidate list.</p>
      <CandidateAssessment candidate={result} />
    </div>
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold">
          {stage === 'profile' ? 'Candidate profile' : 'Skill verification interview'}
        </h1>

        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {stage === 'profile' && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => !parsing && inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center text-sm transition ${
                dragging ? 'border-slate-700 bg-slate-100' : 'border-slate-300 bg-white'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                hidden
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {parsing ? (
                <p className="font-medium">Reading and parsing resume…</p>
              ) : (
                <>
                  <p className="font-medium">Drag &amp; drop a resume here, or click to browse</p>
                  <p className="mt-1 text-slate-500">PDF or DOCX, up to 5 MB. Files are processed in memory and never stored.</p>
                </>
              )}
            </div>

            {success && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {success}
              </div>
            )}
            {warnings.length > 0 && (
              <ul className="list-disc rounded-md border border-amber-200 bg-amber-50 py-3 pl-8 pr-4 text-sm text-amber-900">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}

            <section className={`${cardCls} grid gap-4 sm:grid-cols-2`}>
              <Field label="Full name *">
                <input className={inputCls} value={profile.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputCls} value={profile.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={profile.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Applied role">
                <input className={inputCls} value={profile.role} onChange={(e) => set('role', e.target.value)} />
              </Field>
              <Field label="Experience level">
                <select className={inputCls} value={profile.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                </select>
              </Field>
            </section>

            <section className={`${cardCls} grid gap-4`}>
              <Field label="Technical skills (comma-separated)">
                <textarea className={inputCls} rows={2} value={profile.skills} onChange={(e) => set('skills', e.target.value)} />
              </Field>
              <Field label="Programming languages (comma-separated)">
                <textarea className={inputCls} rows={2} value={profile.languages} onChange={(e) => set('languages', e.target.value)} />
              </Field>
            </section>

            <ListSection
              title="Education"
              items={profile.education}
              onChange={(v) => set('education', v)}
              blank={{ institution: '', degree: '', field: '', period: '' }}
              fields={[['institution', 'Institution'], ['degree', 'Degree'], ['field', 'Field'], ['period', 'Period']]}
            />
            <ListSection
              title="Work experience & internships"
              items={profile.experience}
              onChange={(v) => set('experience', v)}
              blank={{ company: '', title: '', period: '', description: '' }}
              fields={[['company', 'Company'], ['title', 'Title'], ['period', 'Period'], ['description', 'Description', true]]}
            />
            <ListSection
              title="Projects"
              items={profile.projects}
              onChange={(v) => set('projects', v)}
              blank={{ name: '', description: '', technologies: '' }}
              fields={[['name', 'Name'], ['technologies', 'Technologies (comma-separated)'], ['description', 'Description', true]]}
            />

            <section className={`${cardCls} grid gap-4`}>
              <Field label="Links (GitHub, LinkedIn, portfolio — one per line)">
                <textarea className={inputCls} rows={3} value={profile.links} onChange={(e) => set('links', e.target.value)} />
              </Field>
              <Field label="Certifications (one per line)">
                <textarea className={inputCls} rows={3} value={profile.certifications} onChange={(e) => set('certifications', e.target.value)} />
              </Field>
              <Field label="Achievements (one per line)">
                <textarea className={inputCls} rows={3} value={profile.achievements} onChange={(e) => set('achievements', e.target.value)} />
              </Field>
            </section>

            <button
              onClick={startInterview}
              disabled={parsing}
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Confirm details &amp; start interview
            </button>
          </>
        )}

        {stage === 'interview' && (
          <>
            <p className="text-sm text-slate-600">
              Questions are generated from the confirmed resume claims. Answers are compared against claimed skills,
              projects and experience. Skip any you cannot answer; unanswered claims are marked as insufficient evidence, not as wrongdoing.
            </p>
            {questions.map((q, i) => (
              <div key={i} className={cardCls}>
                <p className="mb-2 text-sm font-medium">{i + 1}. {q}</p>
                <textarea
                  className={inputCls}
                  rows={4}
                  value={answers[i]}
                  onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                />
              </div>
            ))}
            <div className="flex gap-3">
              <button
                onClick={() => setStage('profile')}
                disabled={analyzing}
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={submitInterview}
                disabled={analyzing}
                className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {analyzing ? 'Analyzing…' : 'Run skill verification'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ListSection<T extends Record<string, string>>({
  title, items, onChange, blank, fields,
}: {
  title: string
  items: T[]
  onChange: (v: T[]) => void
  blank: T
  fields: ([keyof T & string, string] | [keyof T & string, string, boolean])[]
}) {
  return (
    <section className={`${cardCls} flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <button className="text-sm underline" onClick={() => onChange([...items, { ...blank }])}>+ Add</button>
      </div>
      {items.length === 0 && <p className="text-sm text-slate-500">None found. Add entries if applicable.</p>}
      {items.map((item, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
          {fields.map(([key, label, wide]) => (
            <div key={key} className={wide ? 'sm:col-span-2' : ''}>
              <Field label={label}>
                {wide ? (
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={item[key]}
                    onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)))}
                  />
                ) : (
                  <input
                    className={inputCls}
                    value={item[key]}
                    onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)))}
                  />
                )}
              </Field>
            </div>
          ))}
          <button
            className="text-left text-sm text-red-700 underline sm:col-span-2"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  )
}

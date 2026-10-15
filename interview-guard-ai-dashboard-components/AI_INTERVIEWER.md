# Resume-based voice interviewer

## Start locally

Backend (from the repository root):

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Frontend (second terminal, from the repository root):

```powershell
cd interview-guard-ai-dashboard-components
pnpm install --frozen-lockfile
pnpm dev
```

Open `/interview`. In the AI interviewer card, paste resume text (30–16,000 characters), optionally enter a target role, read the Groq-processing consent, and start the interview. Plain-text `.txt` files are supported; copy text from PDF/DOCX resumes for this MVP. Remove unnecessary private contact details before submitting.

## Credentials and endpoints

Set `GROQ_API_KEY` in ignored `backend/.env`; never use a NEXT_PUBLIC variable or commit the key. `GROQ_INTERVIEW_MODEL` optionally overrides the tested default `openai/gpt-oss-20b`. This service is independent of the legacy Gemini analysis service and its MOCK_AI setting. It reports provider errors instead of silently showing mock questions. Changing credentials requires a backend restart. Workspace code cannot revoke or regenerate keys in the Groq account.

The browser calls the same-origin Next proxy `/api/interview/question` and `/api/interview/transcribe`. Only the existing FastAPI backend contacts Groq. `INTERVIEW_BACKEND_URL` is an optional server-only Next environment setting; it defaults to `http://127.0.0.1:8000`. This is a local hackathon service; add authenticated access and usage controls before public deployment.

## Voice workflow

- Questions use browser/device text-to-speech. Read again, stop playback, or uncheck Read questions aloud. If the browser has no speech service, the question remains readable.
- Record voice answer requests a separate audio-only microphone stream. Stop & transcribe sends only this answer clip to Groq Whisper (`whisper-large-v3-turbo`), releases the microphone, and appends text to the editable answer. English transcription is used.
- Maximum answer audio is 2 minutes / 8 MB. Recording, permission waiting, and transcription can be cancelled. Late permission or network results cannot restore cancelled answers. Streams stop on cancellation/navigation/unmount.
- Read/correct the transcript, then submit. No transcript is auto-submitted. Typed answers are always available. Question audio stops before an answer recording begins; headphones reduce speaker feedback.
- Five submitted answers complete the interview. End early, download submitted answers as text, or clear the session. Resume, question history, and transcripts stay only in component memory, aside from explicit requests to Groq and user downloads.
- Full webcam recordings and face-reference images are not uploaded by this feature. Face observations do not affect the questions or review score. Generated questions/transcripts do not automatically become verified evidence or risk results; the existing results remain labeled demo data.

## Verification

Run frontend `pnpm test`, `pnpm typecheck`, and `pnpm build`. Run backend `python -m unittest test_interviewer -v` from backend. Backend tests mock the provider and do not use quota.

Verified live with fictional data: Groq generated a resume-specific question and a follow-up, and transcribed a synthetic spoken answer. The production browser started TTS, supported typed-answer submission and pending-microphone cancellation, and had no captured console errors or horizontal overflow at 390px. Real microphone capture through the in-app browser remained permission-pending; real participant audio and full interview recording together still need a regular-browser check.

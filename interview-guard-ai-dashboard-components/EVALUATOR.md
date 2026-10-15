# Candidate evaluation workspace

Open the home page and select Add candidate. Upload a PDF/DOCX resume or enter the candidate profile manually, confirm the skills, answer the generated interview questions, and run skill verification. View all candidates returns to the evaluator dashboard. Add another candidate starts a fresh profile while preserving completed analyses.

Use the candidate list to inspect individual technical review scores, skill evidence, limitations, and interview answers. Search by name/skill, filter by role or analysis source, and optionally sort by ascending review index. Lower is fewer consistency concerns, not better hiring suitability. Missing evidence remains visible and can affect the backend index. Mock results are visibly marked. The sample report uses a different demonstration rubric and never enters the candidate collection.

Candidate IDs distinguish people with the same name. Re-analyzing an existing profile replaces its previous analysis, without duplicating the candidate. Navigation tabs preserve an unfinished intake. A fresh Add candidate action starts a new profile.

## Storage boundary

This prototype collects multiple candidates in the current page session. Refreshing, navigating to the interview studio, or closing the page clears the collection. Separate browsers/users do not share results. There is no database, account authorization, or cross-device evaluator inbox in this change. Face and voice observations never influence candidate selection or charts.

## Backend connection

By default intake calls the same-origin /api/parse-resume and /api/analyze proxies. INTERVIEW_BACKEND_URL configures the server-side FastAPI destination (default http://127.0.0.1:8000). Existing NEXT_PUBLIC_API_URL configuration can still explicitly target a backend directly. Backend availability errors preserve form answers for retry. Resume parsing and technical analysis use the existing backend configuration; mock technical analysis is separate from Groq question generation/transcription.

## Checks

pnpm typecheck
pnpm test
pnpm build

The candidate data tests cover missing/unknown assessments, duplicate skill claims, null/invalid/zero scores, and same-name candidate preservation during updates. Browser smoke testing uses fictional profiles and mock analysis.

For a production build alongside a running dev server on Windows, set NEXT_BUILD_DIR=.next-validation before pnpm build; this keeps build output separate from the active .next directory.

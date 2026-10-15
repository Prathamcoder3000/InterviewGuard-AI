# InterviewGuard AI Backend

Fair, transparent, and objective technical interview consistency review-support backend built for the TCS Tech Day hackathon.

---

## 🎯 What InterviewGuard AI Does
InterviewGuard AI compares a candidate's claimed technical skills and the target job role against actual interview responses and verified transcripts. It provides:
- **Positive Technical Evidence**: Concrete citations of technical depth and architectural reasoning.
- **Skill Gaps & Discrepancies**: Transparently identifies unaddressed, partial, or missing claimed competencies.
- **Targeted Follow-Up Probes**: Recommends technical follow-up questions to clarify areas of uncertainty.
- **Decoupled Architecture**: Separates subjective media observations from objective technical consistency scoring.

---

## 🛡️ Responsible AI & Ethical Guardrails
1. **No False Accusations**: Weak answers, pauses, accents, nervousness, gaze shifts, or speech pacing are **never** treated as indicators of cheating, deception, impersonation, or deepfakes.
2. **Untrusted Input Protection**: Candidate answers are treated as untrusted data; prompt-injection attempts inside transcript text are neutralised.
3. **Transparent Scoring**: Scoring is deterministic and computed purely in Python with clear rules and bounds—never invented or hallucinated by the LLM.
4. **Isolated Media Status**: `media_analysis_status` defaults to `not_evaluated` and does not inflate or deflate technical consistency ratings.
5. **Human-in-the-Loop**: Prototype consistency indicators support hiring reviewers; they are not automated rejection filters.

---

## 🧮 Deterministic Scoring Rules

The risk score reflects technical qualification alignment (0 to 100), broken into transparent categories:
- **Unsupported Claimed Skills (Max 60 points)**: Proportion of claimed skills not demonstrated or unaddressed in the interview.
- **Weak / Partial Technical Explanations (Max 25 points)**: Proportion of skills where concepts are mentioned superficially without implementation depth.
- **Identified Contradictions (Max 15 points)**: Factual contradictions between responses (5 points per distinct contradiction, capped at 15).

### Risk Bands
- **Low Risk (0 - 34)**: Strong demonstrated proficiency aligning with role expectations.
- **Medium Risk (35 - 69)**: Partial demonstration; follow-up technical assessment advised.
- **High Risk (70 - 100)**: Substantial divergence between claimed skills and interview evidence.
- **Insufficient Evidence (`risk_score = null`, `risk_level = "insufficient_evidence"`)**: Transcript has too few substantive words to fairly evaluate proficiency.

---

## 📂 Backend File Structure
```
backend/
├── .env.example       # Template for configuration & secrets
├── requirements.txt   # Backend dependencies (FastAPI, google-genai, etc.)
├── schemas.py         # Pydantic v2 data models with backward-compatible aliases
├── scoring.py         # Deterministic Python scoring logic (60 / 25 / 15 weights)
├── ai_service.py      # Google GenAI SDK integration + offline mock engine
├── main.py            # FastAPI application with CORS and lifecycle management
├── test_backend.py    # Automated test suite covering 7 essential verification categories
└── README.md          # Complete documentation and setup manual
```

---

## 🚀 Windows PowerShell Setup & Run Instructions

### Step 1: Open PowerShell in the Backend Folder
```powershell
cd D:\InterviewGuard-AI\backend
```

### Step 2: Install Dependencies
```powershell
python -m pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

By default, `.env` includes:
```env
MOCK_AI=true
GEMINI_API_KEY=
PORT=8000
HOST=0.0.0.0
```

> **Note on Mock vs. Live AI:**
> - When `MOCK_AI=true` (or when no API key is set), InterviewGuard AI runs completely offline with deterministic mock evaluation. All responses include `is_mock: true` and `status: "processed_mock"`.
> - To enable real Google Gemini analysis, set `MOCK_AI=false` and provide your key in `.env`:
>   ```env
>   MOCK_AI=false
>   GEMINI_API_KEY=AIzaSy...
>   ```

### Step 4: Start the FastAPI Server
```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- **API Base URL**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Running Automated Tests

Run the full automated test suite anytime using `pytest`:
```powershell
python -m pytest test_backend.py -v
```

This verifies:
1. `GET /health` liveness.
2. Valid `POST /api/analyze` in mock mode.
3. Insufficient evidence handling on sparse input (returns `risk_score: null`).
4. Optional input handling (`verified_transcript` string text).
5. Strict Pydantic v2 malformed request rejection (HTTP 422).
6. The three core synthetic scenarios (positive, negative/inconsistent, and inconclusive).
7. AI error fallback (automatic safe fallback to mock mode if Gemini API key fails or network drops).

---

## 📡 API Reference & Examples

### 1. Liveness Check: `GET /health`
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method GET
```
**Response:**
```json
{
  "status": "ok"
}
```

---

### 2. Primary Analysis Endpoint: `POST /api/analyze`

#### Scenario A: Positive Technical Consistency (Mid-level Developer)
```powershell
$body = @{
    candidate_id = "cand_101"
    candidate_name = "Aarav Sharma"
    claimed_skills = @("Python", "FastAPI", "Docker")
    experience_level = "mid"
    applied_role = "Backend Engineer"
    interview_qa = @(
        @{
            question = "How do you structure FastAPI services for production?"
            answer = "We organize routes using APIRouter, use Depends() for dependency injection of database sessions, configure Pydantic schemas for request validation, and containerize with Docker using uvicorn async workers."
        },
        @{
            question = "Explain async concurrency in Python."
            answer = "Python asyncio runs a single-threaded cooperative multitasking event loop using async and await, yielding execution during non-blocking network I/O."
        }
    )
    observations = @("Candidate maintained consistent pacing.")
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/analyze" -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

**Response Contract:**
```json
{
  "candidate_id": "cand_101",
  "risk_score": 0,
  "risk_level": "low",
  "status": "processed_mock",
  "is_mock": true,
  "reasons": [
    "Demonstrated technical skills strongly align with expectations for a mid role.",
    "Key technical concepts were articulated clearly with relevant terminology."
  ],
  "skill_analysis": [
    {
      "skill": "Python",
      "assessment": "demonstrated",
      "evidence": "[MOCK_AI] Candidate provided concrete explanation of concepts and architecture related to Python.",
      "demonstrated_level": "intermediate",
      "confidence": 0.88,
      "evidence_notes": "[MOCK_AI] Strong demonstrated discussion of Python."
    },
    {
      "skill": "FastAPI",
      "assessment": "demonstrated",
      "evidence": "[MOCK_AI] Candidate provided concrete explanation of concepts and architecture related to FastAPI.",
      "demonstrated_level": "intermediate",
      "confidence": 0.88,
      "evidence_notes": "[MOCK_AI] Strong demonstrated discussion of FastAPI."
    },
    {
      "skill": "Docker",
      "assessment": "demonstrated",
      "evidence": "[MOCK_AI] Candidate provided concrete explanation of concepts and architecture related to Docker.",
      "demonstrated_level": "intermediate",
      "confidence": 0.88,
      "evidence_notes": "[MOCK_AI] Strong demonstrated discussion of Docker."
    }
  ],
  "next_action": "Proceed to team-fit or subsequent interview round.",
  "limitations": [
    "Evaluations reflect only provided Q&A transcript text and may not capture full candidate potential.",
    "Nervousness, pauses, or unconventional phrasing are never treated as evidence of deception or misconduct.",
    "Prototype consistency indicators are designed to support human review, not replace holistic evaluation."
  ],
  "media_analysis_status": {
    "status": "not_evaluated",
    "notice": "Media artifacts, nervousness, gaze shifts, pauses, or speech pacing are unverified and never considered proof of cheating, impersonation, or deepfakes.",
    "details": {
      "recorded_observations_count": 1
    }
  }
}
```

---

#### Scenario B: Inconclusive / Insufficient Evidence
```powershell
$sparse_body = @{
    candidate_id = "cand_102"
    candidate_name = "Pooja Patel"
    claimed_skills = @("Distributed Systems")
    experience_level = "senior"
    interview_qa = @(
        @{
            question = "Describe distributed systems consensus algorithms."
            answer = "I know them."
        }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/analyze" -Method POST -ContentType "application/json" -Body $sparse_body | ConvertTo-Json -Depth 5
```

**Response Contract (`risk_score` is null; `risk_level` is `insufficient_evidence`):**
```json
{
  "candidate_id": "cand_102",
  "risk_score": null,
  "risk_level": "insufficient_evidence",
  "status": "insufficient_evidence",
  "is_mock": true,
  "reasons": [
    "Insufficient interview question/answer data provided to evaluate technical competencies."
  ],
  "skill_analysis": [
    {
      "skill": "Distributed Systems",
      "assessment": "insufficient_evidence",
      "evidence": "Insufficient interview answer text (3 words provided) to evaluate skill proficiency.",
      "demonstrated_level": "unverified",
      "confidence": 0.2,
      "evidence_notes": "Insufficient interview answer text (3 words provided) to evaluate skill proficiency."
    }
  ],
  "next_action": "Schedule a structured technical deep-dive with specific domain questions. Suggested follow-up probes: [1] Could you provide more detail on your experience?",
  "limitations": [
    "Evaluations reflect only provided Q&A transcript text and may not capture full candidate potential.",
    "Nervousness, pauses, or unconventional phrasing are never treated as evidence of deception or misconduct.",
    "Prototype consistency indicators are designed to support human review, not replace holistic evaluation."
  ],
  "media_analysis_status": {
    "status": "not_evaluated",
    "notice": "Media artifacts, nervousness, gaze shifts, pauses, or speech pacing are unverified and never considered proof of cheating, impersonation, or deepfakes.",
    "details": {
      "recorded_observations_count": 0
    }
  }
}
```

---

## 🔧 Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `Address already in use` | Another process is using port 8000 | Run on another port: `--port 8001` or terminate the existing process via PowerShell (`Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess \| Stop-Process`). |
| `ModuleNotFoundError: No module named 'google'` | `google-genai` not installed in active Python | Run `python -m pip install -r requirements.txt`. |
| `HTTP 422 Unprocessable Entity` | Request payload failed Pydantic validation | Check `/docs` schema; ensure `candidate_id`, `candidate_name`, `claimed_skills` (non-empty array), and `interview_qa` are provided. |
| Gemini API error / 403 / Quota | Expired key or quota exhaustion | The backend automatically falls back to deterministic mock evaluation without crashing. |

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment configuration from .env
load_dotenv()

from schemas import (
    CandidateAnalysisRequest,
    CandidateAnalysisResponse,
    MediaAnalysisStatus
)
from ai_service import analyze_candidate_transcript
from scoring import compute_risk_score
from resume_parser import ParseResumeResponse, ResumeError, extract_text, parse_resume_text, MAX_BYTES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("interviewguard_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    mock_mode = os.getenv("MOCK_AI", "true").lower() in ("true", "1", "yes")
    has_api_key = bool(os.getenv("GEMINI_API_KEY", "").strip())
    logger.info(f"InterviewGuard AI backend initialized. MOCK_AI={mock_mode}, GEMINI_API_KEY_PRESENT={has_api_key}")
    yield
    logger.info("InterviewGuard AI backend shut down cleanly.")

app = FastAPI(
    title="InterviewGuard AI Backend",
    version="1.1.0",
    description="Fair, objective interview consistency and skill review-support API",
    lifespan=lifespan
)

# Configure CORS for frontend access
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe returning HTTP 200 and status ok."""
    return {"status": "ok"}

@app.post("/api/parse-resume", response_model=ParseResumeResponse, tags=["Resume"])
async def parse_resume(file: UploadFile = File(...)):
    """
    Parses a PDF/DOCX resume (max 5 MB) into structured fields.
    The file is read into memory only and never written to disk. No OCR.
    """
    content = await file.read(MAX_BYTES + 1)
    try:
        text = extract_text(file.filename or "", content)
    except ResumeError as e:
        raise HTTPException(status_code=e.http_status, detail=str(e))
    return parse_resume_text(text)

@app.post(
    "/api/analyze",
    response_model=CandidateAnalysisResponse,
    status_code=status.HTTP_200_OK,
    tags=["Analysis"]
)
async def analyze_candidate(request: CandidateAnalysisRequest):
    """
    Evaluates technical interview responses against claimed candidate skills.
    
    Ethical & Fairness Guarantees:
    - Answers are treated as untrusted text (protected against prompt injection).
    - Weak answers, nervousness, pauses, accents, or gaze shifts are NEVER flagged as fraud or cheating.
    - Media status defaults to 'not_evaluated' and is decoupled from technical consistency scoring.
    - Deterministic scoring is calculated in Python across transparent weights (60/25/15).
    """
    try:
        # Step 1: Evaluate skills using AI service (or offline mock)
        (
            skill_analyses,
            contradictions,
            follow_up_questions,
            eval_status,
            is_mock,
            insufficient
        ) = analyze_candidate_transcript(request)

        # Step 2: Compute deterministic score and risk level in Python
        risk_score, risk_level, reasons, next_action = compute_risk_score(
            claimed_skills=request.claimed_skills,
            experience_level=request.experience_level,
            skill_evaluations=skill_analyses,
            insufficient_evidence=insufficient,
            identified_contradictions=contradictions
        )

        # Append follow-up questions to next_action if available
        if follow_up_questions:
            formatted_qs = " ".join(f"[{i+1}] {q}" for i, q in enumerate(follow_up_questions[:3]))
            next_action += f" Suggested follow-up probes: {formatted_qs}"

        # Step 3: Transparent assessment limitations
        limitations = [
            "Evaluations reflect only provided Q&A transcript text and may not capture full candidate potential.",
            "Nervousness, pauses, or unconventional phrasing are never treated as evidence of deception or misconduct.",
            "Prototype consistency indicators are designed to support human review, not replace holistic evaluation."
        ]

        # Step 4: Keep media analysis status strictly decoupled from technical consistency score
        media_status = MediaAnalysisStatus(
            status="not_evaluated",
            notice="Media artifacts, nervousness, gaze shifts, pauses, or speech pacing are unverified and never considered proof of cheating, impersonation, or deepfakes.",
            details={"recorded_observations_count": len(request.observations or [])}
        )

        return CandidateAnalysisResponse(
            candidate_id=request.candidate_id,
            risk_score=risk_score,
            risk_level=risk_level,
            status=eval_status,
            is_mock=is_mock,
            reasons=reasons,
            skill_analysis=skill_analyses,
            next_action=next_action,
            limitations=limitations,
            media_analysis_status=media_status
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during candidate analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis processing error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)

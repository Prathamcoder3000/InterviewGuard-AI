import pytest
import os
from fastapi.testclient import TestClient
from main import app
from schemas import (
    CandidateAnalysisRequest,
    InterviewQA,
    SkillAnalysis,
    SkillAssessment
)
from scoring import compute_risk_score

client = TestClient(app)

# 1. Health check test
def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

# 2. Valid POST /api/analyze in mock mode
def test_analyze_mock_mode():
    payload = {
        "candidate_id": "cand_positive_01",
        "candidate_name": "Aarav Sharma",
        "claimed_skills": ["Python", "FastAPI"],
        "experience_level": "mid",
        "applied_role": "Backend Engineer",
        "interview_qa": [
            {
                "question": "How do you structure FastAPI apps for production?",
                "answer": "We organize routes into APIRouter modules, use Depends() for dependency injection of db sessions, configure Pydantic schemas, and run under uvicorn with async workers in Docker."
            },
            {
                "question": "Explain async concurrency in Python.",
                "answer": "Python asyncio runs a single-threaded cooperative multitasking event loop using async and await, yielding control during network I/O operations."
            }
        ],
        "observations": ["Candidate answered calmly and clearly."]
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_id"] == "cand_positive_01"
    assert data["is_mock"] is True
    assert data["status"] == "processed_mock"
    assert data["risk_score"] is not None
    assert data["risk_score"] <= 34  # Low risk band
    assert data["risk_level"] == "low"
    assert data["media_analysis_status"]["status"] == "not_evaluated"
    assert len(data["skill_analysis"]) == 2
    # Verify backward compatible fields are also populated
    for sa in data["skill_analysis"]:
        assert sa["assessment"] in ["demonstrated", "partial", "not_demonstrated", "insufficient_evidence"]
        assert "evidence" in sa
        assert "demonstrated_level" in sa
        assert "evidence_notes" in sa

# 3. Sparse input and insufficient evidence
def test_analyze_insufficient_evidence_sparse():
    payload = {
        "candidate_id": "cand_sparse_02",
        "candidate_name": "Pooja Patel",
        "claimed_skills": ["Distributed Systems", "Kubernetes"],
        "experience_level": "senior",
        "interview_qa": [
            {
                "question": "Tell us about Kubernetes architecture.",
                "answer": "Yes."
            }
        ]
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_id"] == "cand_sparse_02"
    assert data["risk_score"] is None
    assert data["risk_level"] == "insufficient_evidence"
    assert data["status"] == "insufficient_evidence"
    assert "Insufficient" in data["reasons"][0]

# 4. Optional fields: verified_transcript as string text
def test_analyze_with_verified_transcript_text():
    payload = {
        "candidate_id": "cand_transcript_03",
        "candidate_name": "Rohan Gupta",
        "claimed_skills": ["SQL", "PostgreSQL"],
        "experience_level": "mid",
        "interview_qa": [
            {
                "question": "Discuss your database design experience.",
                "answer": "I have designed normalized relational schemas."
            }
        ],
        "verified_transcript": "Candidate discussed query optimization, EXPLAIN ANALYZE, indexing strategies, and ACID transactions in PostgreSQL for high throughput systems."
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_id"] == "cand_transcript_03"
    assert data["risk_score"] is not None
    assert data["risk_level"] in ["low", "medium"]

# 5. Malformed request validation (Pydantic v2 error handling)
def test_analyze_malformed_request():
    # Missing claimed_skills
    payload = {
        "candidate_id": "cand_bad",
        "candidate_name": "Test User",
        "experience_level": "junior",
        "interview_qa": []
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 422
    errors = response.json()["detail"]
    field_names = [e["loc"][-1] for e in errors]
    assert "claimed_skills" in field_names
    assert "interview_qa" in field_names

# 6. Three synthetic scenarios
def test_three_scenarios():
    # Scenario 1: Positive - Relevant, technically correct, consistent
    pos_req = CandidateAnalysisRequest(
        candidate_id="cand_pos",
        candidate_name="Positive Cand",
        claimed_skills=["Docker", "Python"],
        experience_level="mid",
        interview_qa=[
            InterviewQA(
                question="How do you deploy Python services with Docker?",
                answer="We use multi-stage Docker builds based on python:3.11-slim, create virtual environments, configure non-root users for security, and manage dependencies with pip to maintain minimal production container sizes."
            )
        ]
    )
    from ai_service import analyze_candidate_transcript
    evals, contra, follow_ups, status_str, is_mock, is_insufficient = analyze_candidate_transcript(pos_req)
    score, level, reasons, next_act = compute_risk_score(pos_req.claimed_skills, pos_req.experience_level, evals, is_insufficient, contra)
    assert level == "low"
    assert score is not None and score <= 34

    # Scenario 2: Negative/inconsistent - Claimed skill not demonstrated / unfamiliar
    neg_req = CandidateAnalysisRequest(
        candidate_id="cand_neg",
        candidate_name="Negative Cand",
        claimed_skills=["Kubernetes", "Golang"],
        experience_level="senior",
        interview_qa=[
            InterviewQA(
                question="Describe your experience with Kubernetes and Golang.",
                answer="I don't know kubernetes and I am not familiar with golang."
            )
        ]
    )
    evals, contra, follow_ups, status_str, is_mock, is_insufficient = analyze_candidate_transcript(neg_req)
    score, level, reasons, next_act = compute_risk_score(neg_req.claimed_skills, neg_req.experience_level, evals, is_insufficient, contra)
    assert level in ["medium", "high"]
    assert score is not None and score >= 50

    # Scenario 3: Insufficient evidence - Very short answers
    ins_req = CandidateAnalysisRequest(
        candidate_id="cand_ins",
        candidate_name="Inconclusive Cand",
        claimed_skills=["AWS", "Cloud"],
        experience_level="junior",
        interview_qa=[
            InterviewQA(question="Tell me about AWS.", answer="I like it.")
        ]
    )
    evals, contra, follow_ups, status_str, is_mock, is_insufficient = analyze_candidate_transcript(ins_req)
    score, level, reasons, next_act = compute_risk_score(ins_req.claimed_skills, ins_req.experience_level, evals, is_insufficient, contra)
    assert level == "insufficient_evidence"
    assert score is None

# 7. AI fallback behavior when Gemini fails
def test_ai_fallback_on_gemini_error():
    from ai_service import evaluate_with_gemini
    sample_req = CandidateAnalysisRequest(
        candidate_id="cand_fallback",
        candidate_name="Fallback Cand",
        claimed_skills=["Python"],
        experience_level="junior",
        interview_qa=[
            InterviewQA(
                question="What is Python used for?",
                answer="Python is widely used for backend web development, automation scripts, and data engineering pipelines."
            )
        ]
    )
    # Pass an invalid API key to trigger error handling
    results, contradictions, follow_ups, is_insufficient = evaluate_with_gemini(sample_req, "INVALID_TEST_KEY")
    assert len(results) > 0
    assert "Gemini fallback" in results[0].evidence

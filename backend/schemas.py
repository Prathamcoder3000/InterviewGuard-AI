from typing import List, Optional, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, field_validator

class SkillAssessment(str, Enum):
    DEMONSTRATED = "demonstrated"
    PARTIAL = "partial"
    NOT_DEMONSTRATED = "not_demonstrated"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"

class InterviewQA(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000, description="Interview question posed to candidate")
    answer: str = Field(..., max_length=10000, description="Answer provided by candidate")
    timestamp: Optional[str] = Field(None, description="Timestamp or time offset of the response")

class SkillAnalysis(BaseModel):
    skill: str = Field(..., min_length=1, description="Claimed technical skill or domain topic")
    assessment: str = Field(
        ...,
        description="Assessment category: demonstrated | partial | not_demonstrated | insufficient_evidence"
    )
    evidence: str = Field(
        ...,
        description="Neutral evidence citation directly quoting or synthesizing answer content"
    )
    # Backward compatibility with existing frontend/clients
    demonstrated_level: Optional[str] = Field(
        None,
        description="Backward-compatible mapping: advanced, intermediate, beginner, none, or unverified"
    )
    confidence: Optional[float] = Field(
        0.8, ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0"
    )
    evidence_notes: Optional[str] = Field(
        None,
        description="Backward-compatible alias for evidence"
    )

    def model_post_init(self, __context: Any) -> None:
        # Synchronize backward compatible fields if omitted
        if self.evidence_notes is None:
            self.evidence_notes = self.evidence
        if self.demonstrated_level is None:
            level_map = {
                "demonstrated": "intermediate",
                "partial": "beginner",
                "not_demonstrated": "none",
                "insufficient_evidence": "unverified"
            }
            self.demonstrated_level = level_map.get(self.assessment, "unverified")

class CandidateAnalysisRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1, max_length=100, description="Unique identifier for candidate")
    candidate_name: str = Field(..., min_length=1, max_length=200, description="Full name of candidate")
    claimed_skills: List[str] = Field(..., min_length=1, max_length=50, description="List of skills claimed by candidate")
    experience_level: str = Field(..., min_length=1, max_length=50, description="Claimed experience level (e.g., junior, mid, senior)")
    interview_qa: List[InterviewQA] = Field(..., min_length=1, max_length=100, description="List of question and answer pairs")
    applied_role: Optional[str] = Field(None, max_length=150, description="Role applied for")
    portfolio_url: Optional[str] = Field(None, max_length=500, description="Portfolio or code repository URL")
    # Supports both boolean flag or raw verified transcript text
    verified_transcript: Optional[Union[str, bool]] = Field(
        None,
        description="Verified transcript text string or boolean verification flag"
    )
    observations: Optional[List[str]] = Field(
        default_factory=list,
        max_length=50,
        description="Non-accusatory neutral session observations"
    )

    @field_validator("claimed_skills")
    @classmethod
    def clean_skills(cls, v: List[str]) -> List[str]:
        cleaned = [s.strip() for s in v if s and s.strip()]
        if not cleaned:
            raise ValueError("claimed_skills must contain at least one non-empty skill name.")
        return cleaned

class MediaAnalysisStatus(BaseModel):
    status: str = Field(
        default="not_evaluated",
        description="Default is 'not_evaluated' unless a validated media analysis is performed."
    )
    notice: str = Field(
        default="Media artifacts, nervousness, gaze shifts, pauses, or speech pacing are unverified and never considered proof of cheating, impersonation, or deepfakes.",
        description="Responsible AI fairness and disclaimer notice"
    )
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)

class CandidateAnalysisResponse(BaseModel):
    candidate_id: str
    risk_score: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="Deterministic risk score between 0 and 100, or null if evidence is insufficient"
    )
    risk_level: str = Field(
        ...,
        description="low (0-34), medium (35-69), high (70-100), or insufficient_evidence"
    )
    status: str = Field(
        ...,
        description="e.g. processed_mock, processed_gemini, or insufficient_evidence"
    )
    is_mock: bool = Field(
        default=False,
        description="Explicit flag indicating whether evaluation was generated offline in mock mode"
    )
    reasons: List[str] = Field(..., description="Key factual factors contributing to the evaluation")
    skill_analysis: List[SkillAnalysis] = Field(..., description="Per-skill evidence breakdown")
    next_action: str = Field(..., description="Recommended follow-up interview or recruitment step")
    limitations: List[str] = Field(..., description="Known boundaries or limitations of this assessment")
    media_analysis_status: MediaAnalysisStatus = Field(..., description="Separate status for media/stream observations")

from typing import List, Tuple, Optional
from schemas import SkillAnalysis

def compute_risk_score(
    claimed_skills: List[str],
    experience_level: str,
    skill_evaluations: List[SkillAnalysis],
    insufficient_evidence: bool = False,
    identified_contradictions: Optional[List[str]] = None
) -> Tuple[Optional[int], str, List[str], str]:
    """
    Computes a transparent, deterministic consistency risk score based strictly
    on technical evidence alignment.
    
    Transparent Weights & Bands:
    - Unsupported claimed skills: up to 60 points (scaled by fraction of unverified/not demonstrated skills)
    - Weak/partial technical explanations: up to 25 points (scaled by fraction of partially demonstrated skills)
    - Contradictions in technical answers: up to 15 points (5 points per distinct contradiction, max 15)
    
    Risk Bands:
    - Low: 0 - 34
    - Medium: 35 - 69
    - High: 70 - 100
    - Insufficient Evidence: risk_score is None, risk_level is 'insufficient_evidence'

    Fairness Guarantee:
    - Does NOT evaluate, factor, or penalize nervousness, pauses, accents, gaze, or speech pacing.
    - These are prototype consistency indicators, not validated probabilities of fraud or hiring suitability.

    Returns:
        Tuple of (risk_score, risk_level, reasons, next_action)
    """
    if insufficient_evidence:
        return (
            None,
            "insufficient_evidence",
            ["Insufficient interview question/answer data provided to evaluate technical competencies."],
            "Schedule a structured technical deep-dive with specific domain questions."
        )

    if not skill_evaluations or not claimed_skills:
        return (
            None,
            "insufficient_evidence",
            ["No claimed skills or evaluations provided for scoring."],
            "Collect claimed skill list and evaluate against technical interview Q&A."
        )

    # Count skill assessment distributions
    total_skills = len(claimed_skills)
    eval_by_skill = {item.skill.strip().lower(): item for item in skill_evaluations}

    not_demonstrated_count = 0
    partial_count = 0
    insufficient_count = 0
    demonstrated_count = 0
    reasons: List[str] = []

    for skill in claimed_skills:
        skill_clean = skill.strip().lower()
        eval_item = eval_by_skill.get(skill_clean)

        if not eval_item:
            insufficient_count += 1
            reasons.append(f"Claimed skill '{skill}' was not addressed in the provided interview transcript.")
            continue

        assessment = eval_item.assessment.lower()
        if assessment == "demonstrated":
            demonstrated_count += 1
        elif assessment == "partial":
            partial_count += 1
            reasons.append(
                f"Candidate demonstrated partial knowledge in '{skill}', but technical depth or core specifics were missing."
            )
        elif assessment == "not_demonstrated":
            not_demonstrated_count += 1
            reasons.append(
                f"Candidate did not demonstrate required technical concepts for claimed skill '{skill}'."
            )
        elif assessment == "insufficient_evidence":
            insufficient_count += 1
            reasons.append(
                f"Evidence for claimed skill '{skill}' was insufficient to confirm proficiency."
            )
        else:
            # Fallback
            insufficient_count += 1

    # Check if the entire interview had insufficient evidence across all skills
    if (insufficient_count + not_demonstrated_count + partial_count) == total_skills and demonstrated_count == 0 and insufficient_count > 0 and (not_demonstrated_count == 0 and partial_count == 0):
        return (
            None,
            "insufficient_evidence",
            ["Responses provided insufficient technical depth across all claimed skills."],
            "Conduct a targeted live technical discussion covering the claimed stack."
        )

    # 1. Unsupported claimed skills score (max 60 points)
    # Both not_demonstrated and insufficient_count contribute to unverified claimed skill gap
    unsupported_ratio = (not_demonstrated_count + (insufficient_count * 0.75)) / max(total_skills, 1)
    unsupported_points = min(60.0, unsupported_ratio * 60.0)

    # 2. Weak technical explanations score (max 25 points)
    # Partial knowledge demonstrates some familiarity but lacks expected depth
    weak_ratio = partial_count / max(total_skills, 1)
    weak_points = min(25.0, weak_ratio * 25.0)

    # 3. Contradictions score (max 15 points)
    contradictions = identified_contradictions or []
    contradiction_points = min(15.0, len(contradictions) * 5.0)
    for c in contradictions:
        reasons.append(f"Identified answer inconsistency: {c}")

    # Total score calculation: 0 to 100
    calculated_score = int(round(unsupported_points + weak_points + contradiction_points))
    risk_score = max(0, min(100, calculated_score))

    # Determine risk band: Low (0-34), Medium (35-69), High (70-100)
    if risk_score <= 34:
        risk_level = "low"
        next_action = "Proceed to team-fit or subsequent interview round."
        if not reasons:
            reasons = [
                f"Demonstrated technical skills strongly align with expectations for a {experience_level} role.",
                "Key technical concepts were articulated clearly with relevant terminology."
            ]
    elif risk_score <= 69:
        risk_level = "medium"
        next_action = "Conduct follow-up technical assessment focusing on identified gap areas."
        if not reasons:
            reasons = ["Moderate divergence between claimed technical skills and response depth."]
    else:
        risk_level = "high"
        next_action = "Review candidate portfolio or conduct a practical hands-on coding challenge before proceeding."
        if not reasons:
            reasons = ["Significant divergence between claimed proficiency and technical answers."]

    return risk_score, risk_level, reasons, next_action

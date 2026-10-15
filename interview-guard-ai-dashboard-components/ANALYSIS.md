# Interview analysis rubric

The three user-provided analysis dimensions are implemented in `components/interview-guard/analysis-policy.ts` and enforced by `RiskResultsDashboard` before rendering. Incoming legacy scores, factors, summaries, events, confidence values, and automatic rejection recommendations are replaced with policy-derived results.

## Evidence contract

Supply `InterviewRiskResult.analysisInput` using `InterviewAnalysisInput` from `types.ts`. Each finding needs a criterion, explicit observation status, explanation, and linked timestamped evidence. Observed and not-observed findings both require evidence. Missing/invalid references, duplicate criteria, or missing context become Not evaluated. Unknown criteria are ignored.

Positive answer indicators: relevance, own words, consistency with claimed experience, follow-up answers, and explanation/reasoning. These remain visible independently of communication style and never certify honesty or identity.

Negative criteria: contradictory answers, repeated unrelated answers, mismatch with a specific experience claim, and reading material without being able to explain it in follow-up. Each needs distinct primary and comparison/follow-up evidence from transcript or interviewer review. A technical error is a follow-up concern, not a finding of dishonesty.

External assistance is separate: visible use requires video evidence; prohibited notes require video evidence and an explicit rule prohibiting notes; repeated supplied material requires a separate failed follow-up; proctoring evidence requires an approved system and explicit approval in the interview rules. No assistance probability or unauthorized-assistance conclusion is generated.

Communication observations include pauses, uneven pace, unsteady delivery, and self-reported nervousness. They add no review points. Gaze, inferred nervousness, AI-text similarity, face/identity claims, and response delays cannot enter the answer-content score. Emotions, fraud, identity and deepfakes are Not evaluated.

## Scoring and interpretation

The screenshot rules do not specify numeric weights. The MVP uses a transparent, uncalibrated review-priority index: 25 points for each of four supported negative criteria, counted once each. Positive indicators do not offset a contradiction; external assistance and communication do not affect this index. Coverage is shown alongside all criteria. No evaluated negative criteria produces no score, rather than a low-risk clearance. No automatic hiring recommendation is generated.

This frontend does not determine whether a transcript actually supports a supplied finding. A reviewer or future evidence-producing backend must assess the question, answer, claimed experience, related answers and interview rules in context. Structural evidence validation is not semantic verification. No backend, model prompt, or transcript extraction pipeline exists in this repository; none was added. Answer-content results still use explicitly labeled fictional demo evidence. Separately enabled local face observations and reference-photo similarity never enter this rubric.

## Verification

Run `pnpm test`, `pnpm typecheck`, and `pnpm build`. Policy regression tests cover all dimensions, evidence gating, legacy-score exclusion, rubric consistency, and zero contribution from communication/behavioral observations.

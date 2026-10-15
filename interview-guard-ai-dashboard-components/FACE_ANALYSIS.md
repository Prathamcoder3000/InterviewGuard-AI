# Local face analysis and reference-photo comparison

Run `pnpm install --frozen-lockfile`, then `pnpm dev`. The dev/build scripts copy the three required models from the pinned @vladmandic/face-api 1.7.15 package to public/models/face. Generated assets are ignored by Git and served from this application's origin. No CDN, external inference API, or backend upload is used. Do not deploy with model preparation skipped. The model license is copied alongside the assets.

## Workflow

1. Open `/interview`, read the separate face-processing notice, consent, and enable face analysis. This loads models without requesting a camera. If loading fails, recording remains available; stop and re-enable to retry.
2. Choose a consented front-facing reference photo (JPEG/PNG/WebP, at most 8 MB and 16 megapixels). Exactly one sufficiently large, confidently detected, approximately front-facing face is required. The photo is decoded locally, resized to at most 1024 pixels, and released after a 128-element reference embedding is computed.
3. Enable the webcam using the recorder's separate consent. Live frames are sampled at at most 640px width, about one second after each completed inference, while the page is visible. No overlapping live inference loop is scheduled.
4. Observe face count and approximate orientation. Comparison runs only with exactly one sufficiently large/front-facing face. It is withheld on low-quality frames, missing faces, or multiple faces.
5. Clear the reference or stop analysis to zero its template. Camera closure, navigation, and unmount also clear it. No face history, face crops, or biometric template is persisted. Model weights are a non-personal in-memory cache; turning analysis off stops frame processing and releases personal data.

## Interpretation

The reference comparison is an experimental same-person similarity aid, not certified identity verification, authentication, liveness, or deepfake detection. It cannot establish who owns the reference photo. A photo/replay may pass. Lighting, pose, image quality, and demographic performance can cause errors.

The Euclidean embedding distance is displayed as a raw distance, never a probability. Demonstration bands are <=0.50 (within demo range), 0.50–0.65 (inconclusive), >=0.65 (outside demo range). They are not calibrated on this project's users and require human verification. No result changes interview review scores, labels someone dishonest, or makes an employment decision. No emotion, age, gender, confidence, gaze-quality, or protected-trait models are loaded or used.

## Verification

`pnpm test` includes face-quality, similarity, abstention, consent/lazy loading, cleanup, late photo cancellation, hidden-tab, and unavailable-model regression tests. `pnpm typecheck` and `pnpm build` validate the app. Browser acceptance should also cover real camera faces, zero/two faces, different lighting/poses, reference rejection, same/different reference photos, camera disable, navigation, failed model requests, and recording with analysis active. Automated mocked tests do not establish recognition accuracy.

Verified in this environment: 37 automated tests pass; TypeScript and the production build pass. A production browser loaded the real local models, accepted consent, ran inference on a no-face PNG, rejected it with the expected message, and produced no captured console errors. The library emits a Webpack warning about its bundled dynamic require; its tested browser model path works. Real-camera performance and recognition accuracy have not been validated with participant photos.

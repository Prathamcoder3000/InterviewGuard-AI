# Local interview recording

From this frontend directory, using Node 22.13+ and pnpm:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000/interview. HTTPS is required outside localhost.

Validation:

```powershell
node --test hooks/use-interview-recorder.test.cjs
pnpm exec tsc --noEmit
pnpm build
```

The lifecycle tests use Node's built-in TypeScript stripping and browser doubles; they do not validate actual encoded media or replace browser testing.

`pnpm test` and `pnpm typecheck` provide the same checks. Development and production builds use Next's Webpack path because Turbopack's CSS worker failed on this Windows environment. TypeScript errors now fail the production build.

## Validation completed

- Production build with TypeScript validation: passed.
- Standalone TypeScript check: passed.
- Thirteen lifecycle regression tests: passed, including encoder fallback, stop failures, and back/forward restoration.
- Production browser: recorder and existing demo dashboard rendered, consent enabled device controls, permission request cancellation returned to idle, and both pages had no captured console warnings/errors.
- 390px viewport: recorder reflowed without horizontal overflow.
- Real device recording, encoded audio/video playback, download, and timeline seeking against a real clip still require the browser acceptance checks below. The in-app browser kept camera/microphone permission pending and exposes no permission control to this test session.

## Browser acceptance checks

1. Open `/`: confirm the existing dashboard renders with its demo label and recording link.
2. Open `/interview`: camera permission must not be requested until consent is checked and Enable is clicked. Deny permission and confirm actionable error copy. Allow both devices and retry.
3. Check mirrored preview and camera/microphone indicators. Disable camera and confirm the browser camera indicator clears.
4. Enable again, start, speak for 10 seconds, and confirm the timer advances. Stop and confirm devices are released.
5. Play the recording; verify microphone audio and unmirrored video. Test pause, replay, seeking and native mute/unmute. Download and open the file in a media player.
6. Continue to demo results. Click a timeline event: the player must seek within its duration. For events beyond the clip, confirm the explicit out-of-range message. The sample risk results must stay clearly labeled as unrelated to this recording.
7. Retake: old recording and results disappear. Enable and record a new take. Cancel during capture: no partial playback should remain.
8. Disconnect a device during capture. Confirm an interrupted clip or empty-output error, and that all remaining tracks stop.
9. Cancel while permission is pending; accepting the old browser prompt must not leave devices active. Rapidly click Start: only one capture should start.
10. Refresh/close while recording or holding a completed clip: check the browser leave warning when supported. Leaving/unmounting must release devices. Refresh loses local media; download first.
11. Check desktop and a 390px viewport, keyboard focus, consent label, button disabled states, and the browser console for hydration/runtime errors.

## Integration boundaries

`InterviewRecorder` accepts `onRecordingComplete(blob, metadata)`. Metadata contains durationSec, mimeType, fileSize, recordedAt (ISO), and status (complete/interrupted). This callback is the seam for an agreed future upload contract. No backend endpoint is assumed or called, and recording bytes are not persisted or sent to analytics.

Results are embedded on the interview route to preserve the playback URL in memory. The original `/` dashboard remains available. All risk scores and events are existing demo data; they do not analyze the captured recording. Timeline seeks are a wiring demonstration only.

Live preview is always muted to prevent feedback; microphone capture remains enabled. Recorded playback provides mute/unmute controls. Native encoding varies by browser (WebM or MP4). Optional face analysis, uploads, cross-page video persistence, and backend-generated evidence are deferred.

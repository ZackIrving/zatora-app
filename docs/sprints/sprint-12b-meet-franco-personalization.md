# Sprint 12B — Meet Franco + Personalization

Status: Complete

Founder QA: Pass

Final verification: Pass

## Outcome

Sprint 12B replaced the temporary post-Get Started placeholder with a persistent, immersive Franco-led onboarding conversation.

New guests now meet the canonical Tiny Puppy Franco, share a preferred name and support need, receive deterministic personalized acknowledgement copy, and enter a first task before reaching the explicit temporary Sprint 12C boundary. The experience remains local-only: no guest AI request or Supabase guest write occurs.

## Completed

- Replaced the temporary post-Get Started placeholder with the real Franco onboarding conversation.
- Integrated the canonical Tiny Puppy Franco asset.
- Removed questionnaire and wizard language such as “Step 1 of 2” and “Step 2 of 2.”
- Converted onboarding into a persistent, immersive Franco-led conversation.
- Added preferred-name capture.
- Added support-need personalization.
- Preserved guest-only local persistence.
- Preserved Resume.
- Preserved Start Over.
- Preserved Back navigation and answer retention.
- Preserved direct existing-user Sign In.
- Moved guest onboarding state ownership to the App-level architecture.
- Hardened guest onboarding state transitions and coherence rules.
- Added deterministic support-specific acknowledgement copy.
- Added the first-task seam so the flow no longer dead-ends before Sprint 12C.
- Added local `firstTask` capture.
- Added a temporary Sprint 12C boundary with explicit no-AI behavior.
- Added `supportNeed`-aware first-task placeholder examples.
- Preserved the canonical support enum values.

## Guest State and Scope

- Owner: App-level `useGuestOnboarding`
- Domain rules: `guestOnboardingState.js`
- Persistence: guest-only `localStorage`
- Storage key: `zatora_guest_onboarding_v1`
- Name limit: 60 characters
- First-task limit: 500 characters
- Back navigation: retains valid answers
- Resume: normalizes a stored draft to the latest coherent implemented step
- Sprint 12C seam: stores `firstTask` locally and stops before AI execution

Sprint 12B includes no guest AI, guest Supabase write, backend/database/RLS change, account conversion, migration, XP, or Focus Timer integration.

## First-Task Placeholder Mapping

The first-task placeholder is presentation-only. It is derived from the existing persisted `supportNeed`, does not prefill the input, and is not stored as `firstTask`.

| `supportNeed` | Placeholder |
| --- | --- |
| `getting_started` | `e.g. Start the project I've been putting off` |
| `staying_focused` | `e.g. Finish the report I keep getting distracted from` |
| `keeping_up` | `e.g. Catch up on the emails I've been avoiding` |
| `consistency` | `e.g. Get back into my workout routine` |
| `everything` | `e.g. Tackle the thing that's been hanging over me` |
| Missing or invalid fallback | `e.g. Tackle the thing that's been hanging over me` |

Changing the support selection through Back navigation updates the placeholder. An existing `firstTask` remains preserved independently from that placeholder.

## Founder QA and Final Verification

- Sprint 12B verifier: 32/32 Pass
- `npm run build`: Pass
- Targeted ESLint: Pass
- `git diff --check`: Pass
- Responsive QA: Pass
- Enter submission: Pass
- Unicode handling: Pass
- 60-character name limit: Pass
- 500-character first-task limit: Pass
- Resume: Pass
- Start Over: Pass
- Back navigation: Pass
- Support change updates placeholder: Pass
- Existing `firstTask` preserved independently from placeholder: Pass
- No network request during tested guest onboarding interactions: Pass

## Screenshot Documentation

No Sprint 12 verification screenshot folder or approved Sprint 12 verification screenshots were present in the repository at finalization time. No screenshots were invented, recreated, or moved. The temporary Sprint 12C boundary is not represented as a final product screenshot.

## Deferred Work and Prerequisites

- The existing AI authorization issue remains a **hard prerequisite** before real Sprint 12C guest AI.
- Real guest task simplification remains deferred.
- “Make It Even Easier” remains deferred.
- Guest Focus session remains deferred.
- First win remains deferred.
- XP tease remains deferred.
- Tiny Puppy Den reveal remains deferred.
- Profiles remain deferred.
- Guest migration and account conversion remain deferred.
- Welcome Home remains deferred.

## Known Pre-existing Technical Debt

- The existing first-session starter-task race remains deferred.
- The existing `useTasks` `setTasks(data)` defect remains deferred.
- Repository-wide lint debt remains deferred.
- The existing Vite bundle-size warning remains deferred.

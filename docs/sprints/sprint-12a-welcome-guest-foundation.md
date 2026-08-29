# Sprint 12A — Welcome + Guest Foundation

Status: Complete

Founder QA: Pass

Final verification: Pass

## Outcome

Sprint 12A established Zatora's experience-first, account-second entry architecture.

Logged-out new users now enter through Zatora Welcome rather than an immediate authentication wall. Existing users retain direct Sign In access, authenticated sessions bypass guest onboarding, password recovery retains precedence, and signout returns to Welcome.

## Completed

- Introduced the experience-first/account-second entry architecture.
- Replaced the first-visit authentication wall with Zatora Welcome.
- Preserved direct Sign In for existing users.
- Added reusable authentication presentation through `AuthForm`.
- Added the guest onboarding state foundation using a reducer and `localStorage`.
- Established guest schema version 1.
- Established a seven-day guest-draft expiration.
- Added “Continue where you left off” behavior.
- Added Start Over behavior.
- Rejects and removes malformed, unsupported, expired, and otherwise invalid persisted drafts.
- Extracted the authenticated application into `AuthenticatedApp` without an intentional feature-behavior change.
- Made `App.jsx` the future guest-migration and authenticated-bootstrap boundary.
- Preserved password-recovery precedence.
- Ensured authenticated sessions do not display guest onboarding.
- Ensured signout returns to Welcome.
- Kept the guest flow local: it makes no AI request and no Supabase database write.
- Added `FrancoWelcomeVisual` as a replaceable presentation boundary for final Franco artwork.

## Guest State Contract

- Owner: `useGuestOnboarding`
- Live state: React reducer
- Persistence: `localStorage`
- Storage key: `zatora_guest_onboarding_v1`
- Schema version: 1
- Expiration: seven days
- Invalid-state behavior: reject the draft, remove persisted state, and return safely to clean Welcome
- Authentication separation: direct Sign In does not imply guest-data migration, and authenticated sessions do not mount the guest experience

Guest state contains no password, authentication token, authenticated user ID, raw AI prompt, or raw AI response. Local XP remains non-authoritative.

## Entry Boundaries

`App.jsx` owns:

- Auth/session restoration
- Password-recovery precedence
- Logged-out Welcome
- The future migration/bootstrap gate
- Mounting `AuthenticatedApp` only after authentication requirements are satisfied

`AuthenticatedApp` owns the existing authenticated feature hooks, navigation, layout, Home, Daily Plan, Focus, Progress, and other authenticated features.

`WelcomeExperience` owns presentation mode only. `useGuestOnboarding` owns guest domain state and persistence.

## Founder QA

Founder QA verified:

- Fresh Welcome
- Get Started
- Guest-draft creation
- Refresh persistence
- Resume choice
- Continue where you left off
- Start Over and return to clean Welcome
- Direct Sign In
- Back to Welcome
- Successful existing-user authentication
- Authenticated Home
- Daily Plan
- Focus
- Progress
- Authenticated navigation
- Sign Out returning to Welcome
- No observed regression from the `AuthenticatedApp` extraction

## Final Verification

- `npm run build`: Pass
- Targeted Sprint 12A ESLint: Pass
- `git diff --check`: Pass
- Malformed guest draft: Pass
- Unsupported schema version: Pass
- Expired draft: Pass
- Invalid enum: Pass
- Oversized string: Pass
- Invalid string type: Pass
- Valid-draft control: Pass

The invalid-draft cases were exercised through a focused runtime harness against the actual guest-state loader. Every invalid case was rejected and removed without a crash; the valid control was accepted and retained.

## Temporary Artwork Notice

The Franco artwork visible during Sprint 12A founder QA is **temporary**.

Final Tiny Puppy Franco and Tiny Puppy Den artwork will replace it in a later Sprint 12 milestone. Diagnostic Sprint 12A screenshots must not be preserved or represented as final product screenshots.

## Deferred Work and Prerequisites

Before Sprint 12C introduces guest AI, the existing AI authorization architecture must receive its separate security-hardening pass. That work is not part of Sprint 12A.

Deferred items include:

- Final Tiny Puppy Franco artwork
- Final Tiny Puppy Den artwork
- Sprint 12B personalization
- AI security prerequisite before Sprint 12C
- Guest AI
- Guest focus
- Progression tease
- Account conversion and guest migration
- Welcome Home

## Known Pre-existing Technical Debt

- Repository-wide lint remains at 16 errors and 10 warnings in pre-existing files. Sprint 12A did not introduce those findings.
- The existing Vite bundle-size warning remains. Sprint 12A did not introduce that warning.

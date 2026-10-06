# Sprint 12C / M5 — First Productivity Win and Controlled Guest AI

## M5 controlled integration status (2026-10-06)

**Final status: M5 COMPLETE.** Founder physical-iPhone QA through Expo Go passed. The controlled guest AI integration/deployment and provider QA are technically complete, including the successful retry after API credits were restored and the depth-2 quality fix. Guest AI was disabled after Founder QA and reverified live as sanitized `503 feature_disabled`. Finalization made zero additional provider calls.

The approved native First Win screens now use `mobile/src/guest/guestFirstWinLiveService.ts` as their primary generation path. The adapter builds the request with the shared `buildGuestFirstWinRequest` contract and sends exactly `task`, `supportNeed`, and `simplificationDepth` to `guest-first-win`. It sends no guest ID, migration ID, user ID, email, device identifier, raw network address, arbitrary state, or authenticated identity. The quota flow is an opaque, cryptographically generated local token sent only in the approved `x-zatora-guest-flow` header and cleared when a guest starts over.

The native request has no browser `Origin` header. The Edge Function now allows the native/no-Origin path to continue to validation and abuse controls, while rejecting any present browser Origin that is not in `GUEST_AI_ALLOWED_ORIGINS`. No production origin or wildcard was added. The response is checked for exactly `acknowledgement`, `tinyFirstStep`, `followUpSteps`, and `francoLine` with the authoritative shared result validator before it reaches reducer state.

The deterministic M4 service and explicit local fallback remain available. Provider errors, timeout, offline state, invalid output, feature-disabled state, and quota errors remain explicit recovery states; no automatic AI retry or XP award was added. Completion remains idempotent at exactly +25 XP.

Automated M5 structural verification passed, as did M1, M2, M3, M4, Sprint 12C, abuse-control, and Security Pass A structural checks. Mobile TypeScript and targeted Expo lint passed. The native flow token now uses Expo SDK 57's supported `expo-crypto` implementation.

The dedicated worker credential and Edge secret names were provisioned through the authenticated Supabase CLI without printing, logging, or writing their values. `GUEST_QUOTA_DB_URL` uses the project's exact Supavisor transaction pooler on port 6543 with SSL required; the worker connection and least-privilege grants were verified. `GUEST_ABUSE_HMAC_SECRET`, `GUEST_AI_NETWORK_SIGNAL_CONFIRMED=true`, local-only `GUEST_AI_ALLOWED_ORIGINS`, and the existing `OPENAI_API_KEY` are present.

`guest-first-win` is deployed and active with `verify_jwt=false`. Initial disabled-path QA returned sanitized `503 feature_disabled`; native requests without `Origin` continued correctly; unauthorized browser Origin was rejected; and an allowed local preflight returned the exact origin with no wildcard. After controlled enablement, malformed JSON, depth 3, and an unknown `userId` key were rejected before quota reservation. The original provider attempt reserved exactly one quota slot and returned sanitized `429 rate_limited`; that sequence stopped without retry or depth 1/2 calls. After the Founder restored API credits, a separately authorized retry used one new synthetic flow and exactly three calls at depths 0/1/2. All returned HTTP 200 with exact bounded responses and no leakage. Depth 1 reduced three shirts to one, but depth 2 retained standing/picking up and added walking. Quota totals moved from 39 flows / 48 reservations to 40 flows / 51 reservations. The switch was disabled and reverified. At that point, provider availability was resolved but depth-2 quality blocked Founder QA; the subsequent fix and final sign-off below cleared that blocker.

## M5 depth-2 quality fix (2026-10-06)

The prior three-call retry passed transport and schema checks but failed product quality at depth 2: it added walking to the previous standing-and-picking-up step. The prompt only said to prefer a setup action and did not prohibit compound sequences, extra prerequisites, or restating an already small step. JSON Schema validates structure and bounds, not activation effort.

Inspection also clarified the existing contract: native depth 0 sends `draft.firstTask`, while depth 1/2 already send `draft.simplifiedTask` in the same bounded `task` field. No new prior-output field, history, identity, or personal context was added. The endpoint also continues to accept an original task with depth alone; strict comparison to an unseen earlier response cannot be guaranteed for that usage. The fix improves instructions, not a universal semantic guarantee.

`guestFirstWinPrompt.ts` now defines depth 0 as a small concrete starting action, depth 1 as a materially easier action, and depth 2 as the smallest useful immediate atomic action. Higher depth must reduce effort without adding actions. Depth 2 explicitly prohibits action chains, planning, unnecessary walking/standing/setup, and repeating the whole task; an already small pick-up step can become touching one item. Supportive personality stays in `francoLine`. The request/response schema, maximum depth 2, provider bounds, native UI, quota infrastructure, and approved M4 deterministic fallback implementation remain unchanged. The fallback was reviewed and its bounded outputs verified; these checks do not claim a general natural-language comparison proof.

The strengthened M5 verifier executes the prompt builder for original-task, previous-step, and writing examples at all depths and checks the explicit atomic-action instructions and existing request boundaries. Targeted results: M5 51 checks, Sprint 12C 7 checks, abuse control 8 checks, Security Pass A 21 checks, mobile TypeScript, and `git diff --check` all passed before the controlled generation.

The fix was deployed to `guest-first-win` with `verify_jwt=false` while disabled. Exactly **one** intentional provider generation was made in this run, at depth 2, using the synthetic previous step “Stand up and pick up one clean shirt from where it is folded or lying.” It returned HTTP 200 and **“Touch one shirt.”** with the exact four-field response and no follow-ups. This is one atomic action with a lower activation barrier and no provider metadata, raw error, or unrelated account/personal data. Quota totals increased from 40 flows / 51 reservations to 41 flows / 52 reservations; source verification confirms reservation precedes provider invocation. No depth 0/1 calls or retries were made.

`GUEST_AI_ENABLED=false` was restored immediately and the live endpoint reverified as sanitized `503 feature_disabled`. The depth-2 quality fix is **PASS**. At the end of that fix run, M5 was ready for Founder physical-iPhone QA and no commit or push had occurred. Founder subsequently completed the QA below and authorized finalization.

## M5 Founder physical-iPhone QA — PASS

Founder tested live guest AI through Expo Go on a physical iPhone with **“Study for CompTIA A+ for 30 minutes”** and reported this progression:

- Depth 0: “Set a 30-minute timer now.”
- Depth 1: “Open your phone’s Clock/Timer app now.”
- Depth 2: “Unlock your phone.”

A second run of the same task produced different but valid, task-relevant live results. Founder confirmed progressive simplification, atomic/very-low-activation depth 2, and no third “Make it even smaller” CTA. Start with this, commitment, Still working, I did it, exactly +25 XP, resume/reopen, and no duplicate XP all passed. These are Founder-reported physical-device results, not additional Codex provider tests.

Founder is preserving screenshot evidence under these filenames:

- `Sprint 12C - First Productivity Win/Verification/m5-live-ai-depth-0-founder-qa.png`
- `Sprint 12C - First Productivity Win/Verification/m5-live-ai-depth-1-founder-qa.png`
- `Sprint 12C - First Productivity Win/Verification/m5-live-ai-depth-2-founder-qa.png`

These screenshots were not found in the repository during finalization and are not claimed as Git-tracked artifacts. Final `GUEST_AI_ENABLED` is **false**, with live sanitized `503 feature_disabled` verified after the Founder QA window. No secrets were rotated, quota infrastructure was not changed, and no further provider generation was made during finalization.

Final verification passed: M1 (14 checks), M2 (10), M3 (26), M4 (15), M5 (51), Sprint 12C (7), guest abuse control (8), Security Pass A structural (21), mobile TypeScript, targeted Expo lint on the four changed native source files (zero errors/warnings), ESLint on the changed verifier scripts, and `git diff --check`. Lint tooling was isolated outside the repository; no lint dependency/configuration changes were added to the milestone.

## Product objective

Guest onboarding now turns an avoided task into a tiny first move. The emotional outcome is: “Oh. I can actually start this.”

## Flow

First-task entry → Help me start → Franco processing → **LET'S MAKE THIS SMALLER** result → Start with this or Make it even smaller (at most two further reductions) → quiet commitment/body-double state → Still working or I did it → proportional first-win celebration → +25 local starter XP → explicit Sprint 12D seam.

## Guest state v2

`guestOnboardingState.js` uses version 2 and retains `guestId`, `migrationId`, name, support need, first task, timestamps, TTL, migration intent, and migration status. New fields are `simplificationStatus`, `simplificationDepth`, `simplifiedTask`, `followUpSteps`, `francoLine`, `acknowledgement`, `simplificationError`, `acceptedTask`, `completedFirstWin`, and `earnedStarterXP`.

Version 1 drafts are migrated in memory and persisted under the v2 key. Existing IDs and timestamps are preserved. Processing drafts normalize to an explicit offline/error recovery state; no AI request is automatically repeated after refresh. Available results, commitment, and win states resume from local storage.

The reducer owns the domain transitions. `COMPLETE_FIRST_WIN` atomically sets `completedFirstWin`, `earnedStarterXP: 25`, and `step: win`; replayed completion actions are no-ops.

## Guest AI architecture

`guest-first-win` is intentionally public (`verify_jwt = false`) because this path is for users without accounts. It accepts only a JSON object with `task`, `supportNeed`, and `simplificationDepth`. Unknown keys, oversized bodies/tasks, invalid support needs, non-integer depths, and depths above 2 are rejected.

The function has no Supabase client, service-role key, authenticated context, user ID, profile/task/history query, or authenticated-table write. It uses `gpt-5-mini`, low reasoning effort, `store: false`, a 12-second timeout, 500 output tokens, and a strict JSON Schema. The response is exactly `acknowledgement`, `tinyFirstStep`, `followUpSteps`, and `francoLine`, with strict Unicode and depth-specific bounds. Raw provider output and errors are not returned.

The `GUEST_AI_ENABLED` switch is fail-closed: only the exact value `true` permits the path; missing, false, or unexpected values return `503 feature_disabled`. CORS is configuration-driven through `GUEST_AI_ALLOWED_ORIGINS`; local Vite origins are the only defaults. Production origins must be explicitly configured before deployment.

## Durable abuse controls and deployment gate

The client prevents duplicate submissions and never auto-retries. The implementation includes a private Postgres migration and a worker-only RPC boundary. The function reserves quota before calling OpenAI, so a provider timeout or invalid response does not refund a reservation. Live database permission and concurrency QA passed without any provider call.

The migration creates `guest_abuse` with a singleton `network_policy`, HMAC-fingerprint-only `flow_budgets`, and `network_windows`. Each flow is capped at 3 reservations. The initial network policy is 30 reservations per 1-hour window, with a 7-day flow TTL; these values are stored in `network_policy` so the Founder can adjust them after observing real traffic. Expiry indexes are present for a separately scheduled cleanup job; no cleanup job is currently enabled. The RPC is `SECURITY DEFINER`, owned by a `NOLOGIN` owner role, and locks flow rows before network rows in a deterministic order. `guest_quota_worker` receives only schema usage and RPC execution; `anon`, `authenticated`, `service_role`, and direct table access are revoked. RLS is enabled as defense in depth.

The Edge Function uses `GUEST_QUOTA_DB_URL` with the Supavisor transaction pooler, SSL required, `prepare: false`, and a single short-lived connection slot. The dedicated worker credential is provisioned only in the database role and Edge secret store; no password or production URL is embedded in the repository or migration.

The network signal is deliberately narrow: only an exact, normalized `cf-connecting-ip` value is accepted after an explicit `GUEST_AI_NETWORK_SIGNAL_CONFIRMED=true` configuration gate. The raw value is never stored or logged; flow and network values are HMAC-SHA-256 fingerprints with purpose separation. This is abuse correlation, not identity or authentication. Live gateway testing verified that `x-forwarded-for` and `x-real-ip` do not replace the candidate, while caller-supplied `cf-connecting-ip` is rejected by the gateway before reaching the function. The signal is therefore **VERIFIED** for this project; keep the explicit configuration gate and fail closed if gateway behavior changes.

**Deployment status: DEPLOYED, DISABLED, AND M5 COMPLETE**. The provider-availability and depth-2 product-quality blockers are cleared, and Founder physical-iPhone QA passed. The kill switch is false. Turnstile remains a future adaptive seam, not part of the normal path.

## Accessibility and failure UX

The processing, result, and error messages use `aria-live`, native buttons, visible focus states, wrapping content, and no animation-only status. Failure states preserve the task and offer an explicit retry or deterministic local fallback. Still working preserves commitment and makes zero AI requests. No XP is awarded by Start with this.

## Security isolation

Security Pass A authenticated architecture is unchanged: `ai-task-coach` and `daily-ai-planner` retain `verify_jwt = true`, JWT-derived caller identity, caller-scoped Supabase clients, and RLS. No guest state is written to authenticated tables, and no authenticated function is redeployed by this sprint.

## QA and deferred work

Automated structural/state verification is provided by `npm run verify:sprint-12c` and `npm run verify:sprint-12c-abuse-control`; existing Security Pass A checks remain required. Founder physical-iPhone QA passed for the reported M5 flow, progressive simplification, commitment/completion, and resume/idempotency behaviors. This sign-off does not invent separate keyboard, reduced-motion, or failure-path observations beyond the reported tests.

Deferred intentionally: a future exact production web Origin (not needed for native QA), adaptive Turnstile, guest-to-account migration, authenticated XP migration, Den, Growth Tree, streaks, Focus Mode, and send-push cleanup.

## Local implementation and live QA gates

The quota infrastructure deployment applied migration `20260926220711_guest_ai_abuse_control` to project `coytgudqzoexmielqesp`. It created the private schema, dedicated roles, quota tables, and reservation RPC. M5 subsequently provisioned the dedicated worker and Edge secrets, deployed `guest-first-win`, made one original blocked provider attempt plus exactly three authorized continuation calls, and did not commit or push.

Live database QA used synthetic fingerprints only. Sequential flow QA passed 1/2/3 allowed and 4 denied. Ten concurrent reservations for one flow produced exactly 3 allowed and 7 denied, with final `generation_count=3`. Thirty-one fresh flows under one synthetic network fingerprint produced 30 allowed and 1 denied, with final `reservation_count=30`. A different synthetic network fingerprint received an independent allowed reservation. Malformed fingerprint input returned `invalid_fingerprint`. Expired-flow QA was not run because the approved SQL tool rejected the temporary owner-role elevation required to seed an expired row; no production grants were weakened.

The temporary QA worker membership was revoked after the earlier infrastructure tests. M5 rotated a fresh 256-bit worker password and created `GUEST_QUOTA_DB_URL` without exposing either value. The worker remains non-superuser, cannot bypass RLS, cannot create roles or databases, and has no direct table DML. `pg_cron` is not installed and no cleanup job is configured; expiry indexes and bounded TTLs remain in place pending a separate cleanup decision.

## Final pre-deployment readiness review

The repository does not establish an exact production web origin: no Vercel, Netlify, Sites, or other deployment metadata is present, and the README is still the Vite starter README. Production CORS therefore remains **FOUNDER VALUE REQUIRED**; configure one or more exact HTTPS origins in `GUEST_AI_ALLOWED_ORIGINS`, never `*`.

The authenticated Supabase CLI verified secret names only. `OPENAI_API_KEY`, `GUEST_QUOTA_DB_URL`, `GUEST_ABUSE_HMAC_SECRET`, `GUEST_AI_NETWORK_SIGNAL_CONFIRMED`, `GUEST_AI_ALLOWED_ORIGINS`, and `GUEST_AI_ENABLED` are present; values were never read back, printed, logged, or stored locally. Allowed origins remain local-only because this milestone is native controlled QA and no production web origin was invented. `GUEST_AI_ENABLED=false` is the final live state.

`guest_quota_worker` is provisioned with a fresh cryptographically random credential. The approved connection shape is the project's exact Supavisor transaction pooler with SSL required, `prepare: false`, and `max: 1`; the worker retains only schema usage and RPC execution. A live connection check passed through the worker URL.

Expiry is **NONBLOCKING FOR INITIAL BETA**. The RPC rejects a reused expired flow with `flow_expired`, computes network decisions only for the current time bucket, and has indexes on both expiry columns. A later owner-controlled maintenance procedure can delete rows where `expires_at < now()`; no external cleanup service or `pg_cron` job is required before a controlled beta. The deterministic expired-flow test is **SUFFICIENTLY VERIFIED** by the SQL branch, indexed construction, and structural verifier; a privileged live seed is optional rather than a deployment blocker.

Provider protection is sufficient for controlled QA at the application boundary: `gpt-5-mini`, low reasoning effort, 12-second timeout, 500 output tokens, `store: false`, no automatic retries, bounded response validation, and durable quota before provider invocation. The authorized retry completed its maximum three paid calls on one synthetic flow: one each at simplification depths 0, 1, and 2. Transport and schema validation passed at every depth, but progressive simplification did not. Before wider beta, Founder should confirm provider budget alerts, hard spend/rate limits, and the documented emergency-disable procedure.

The authorized deployment order was followed: worker/HMAC provisioning, confirmed network signal, local-only CORS, disabled deployment, disabled-path QA, controlled enablement, deny-path QA, then provider QA. The original sequence stopped after its first `429 rate_limited` response and disabled immediately. After credits were restored, the continuation sequence completed depths 0/1/2 with exactly three calls and no retries, then disabled immediately.

The provider-availability and observed depth-2 simplification blockers are cleared. The approved prompt adjustment, its one-call live QA, and Founder physical-iPhone QA are complete. Keep `GUEST_AI_ENABLED=false` until a separately authorized release or QA window. Re-run the gateway probe after any routing or platform change.

Rollback is to disable guest AI (`GUEST_AI_ENABLED` anything other than exact `true`) before any schema or function rollback. If the migration must be reverted, first stop guest traffic, preserve quota evidence, then use a separately reviewed down migration; do not drop the private schema while the function can still receive traffic.

The win screen is the Sprint 12D handoff seam; it does not reveal or build the Den and does not trigger account conversion.

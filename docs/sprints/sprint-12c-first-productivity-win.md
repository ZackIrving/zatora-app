# Sprint 12C — First Productivity Win

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

The function has no Supabase client, service-role key, authenticated context, user ID, profile/task/history query, or authenticated-table write. It uses `gpt-5-mini`, `store: false`, a 12-second timeout, and 500 output tokens. The response is exactly `acknowledgement`, `tinyFirstStep`, `followUpSteps`, and `francoLine`, with strict Unicode and depth-specific bounds. Raw provider output and errors are not returned.

The `GUEST_AI_ENABLED` switch is fail-closed: only the exact value `true` permits the path; missing, false, or unexpected values return `503 feature_disabled`. CORS is configuration-driven through `GUEST_AI_ALLOWED_ORIGINS`; local Vite origins are the only defaults. Production origins must be explicitly configured before deployment.

## Durable abuse controls and deployment gate

The client prevents duplicate submissions and never auto-retries. The implementation includes a private Postgres migration and a worker-only RPC boundary. The function reserves quota before calling OpenAI, so a provider timeout or invalid response does not refund a reservation. Live database permission and concurrency QA passed without any provider call.

The migration creates `guest_abuse` with a singleton `network_policy`, HMAC-fingerprint-only `flow_budgets`, and `network_windows`. Each flow is capped at 3 reservations. The initial network policy is 30 reservations per 1-hour window, with a 7-day flow TTL; these values are stored in `network_policy` so the Founder can adjust them after observing real traffic. Expiry indexes are present for a separately scheduled cleanup job; no cleanup job is currently enabled. The RPC is `SECURITY DEFINER`, owned by a `NOLOGIN` owner role, and locks flow rows before network rows in a deterministic order. `guest_quota_worker` receives only schema usage and RPC execution; `anon`, `authenticated`, `service_role`, and direct table access are revoked. RLS is enabled as defense in depth.

The Edge Function uses `GUEST_QUOTA_DB_URL` with the Supavisor transaction pooler, SSL required, `prepare: false`, and a single short-lived connection slot. The connection role must be provisioned through the approved secret workflow later; no password or production URL is embedded in the migration.

The network signal is deliberately narrow: only an exact, normalized `cf-connecting-ip` value is accepted after an explicit `GUEST_AI_NETWORK_SIGNAL_CONFIRMED=true` configuration gate. The raw value is never stored or logged; flow and network values are HMAC-SHA-256 fingerprints with purpose separation. This is abuse correlation, not identity or authentication. Live gateway testing verified that `x-forwarded-for` and `x-real-ip` do not replace the candidate, while caller-supplied `cf-connecting-ip` is rejected by the gateway before reaching the function. The signal is therefore **VERIFIED** for this project; keep the explicit configuration gate and fail closed if gateway behavior changes.

**Deployment status: BLOCKED FOR GUEST-AI DEPLOYMENT**. The quota migration is applied and live permission/concurrency QA passed, but guest-first-win remains undeployed pending Edge secret provisioning, production CORS, provider budget confirmation, live provider QA, and Founder product QA. Turnstile remains a future adaptive seam, not part of the normal path.

## Accessibility and failure UX

The processing, result, and error messages use `aria-live`, native buttons, visible focus states, wrapping content, and no animation-only status. Failure states preserve the task and offer an explicit retry or deterministic local fallback. Still working preserves commitment and makes zero AI requests. No XP is awarded by Start with this.

## Security isolation

Security Pass A authenticated architecture is unchanged: `ai-task-coach` and `daily-ai-planner` retain `verify_jwt = true`, JWT-derived caller identity, caller-scoped Supabase clients, and RLS. No guest state is written to authenticated tables, and no authenticated function is redeployed by this sprint.

## QA and deferred work

Automated structural/state verification is provided by `npm run verify:sprint-12c` and `npm run verify:sprint-12c-abuse-control`; existing Sprint 12B and Security Pass A checks remain required. Build and lint results are reported from the implementation session. Founder manual QA remains pending, including mobile/keyboard/reduced-motion/resume/error paths and confirmation that quota writes stay private and no authenticated-table writes occur.

Deferred intentionally: Edge quota connection and HMAC secrets, production CORS values, adaptive Turnstile, guest-to-account migration, authenticated XP migration, Den, Growth Tree, streaks, Focus Mode, and send-push cleanup.

## Local implementation and live QA gates

The quota infrastructure deployment applied migration `20260926220711_guest_ai_abuse_control` to project `coytgudqzoexmielqesp`. It created the private schema, dedicated roles, quota tables, and reservation RPC. It did not set Edge secrets, deploy guest-first-win, call OpenAI, commit, or push.

Live database QA used synthetic fingerprints only. Sequential flow QA passed 1/2/3 allowed and 4 denied. Ten concurrent reservations for one flow produced exactly 3 allowed and 7 denied, with final `generation_count=3`. Thirty-one fresh flows under one synthetic network fingerprint produced 30 allowed and 1 denied, with final `reservation_count=30`. A different synthetic network fingerprint received an independent allowed reservation. Malformed fingerprint input returned `invalid_fingerprint`. Expired-flow QA was not run because the approved SQL tool rejected the temporary owner-role elevation required to seed an expired row; no production grants were weakened.

The temporary QA worker membership was revoked after testing. No worker password or `GUEST_QUOTA_DB_URL` was created. `pg_cron` is not installed and no cleanup job is configured; expiry indexes and bounded TTLs remain in place pending a separate cleanup decision.

## Final pre-deployment readiness review

The repository does not establish an exact production web origin: no Vercel, Netlify, Sites, or other deployment metadata is present, and the README is still the Vite starter README. Production CORS therefore remains **FOUNDER VALUE REQUIRED**; configure one or more exact HTTPS origins in `GUEST_AI_ALLOWED_ORIGINS`, never `*`.

The connected Supabase management surface does not expose secret names through the available read-only project tools, and the dashboard session was not authenticated. Secret status is therefore **NOT CHECKED**, not inferred. The only local environment keys are `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `VITE_VAPID_PUBLIC_KEY`; no guest production secret is present locally. The later provisioning pass must create or verify `GUEST_QUOTA_DB_URL`, `GUEST_ABUSE_HMAC_SECRET`, `GUEST_AI_NETWORK_SIGNAL_CONFIRMED`, `GUEST_AI_ALLOWED_ORIGINS`, and keep `GUEST_AI_ENABLED=false` until controlled QA. `OPENAI_API_KEY` should be verified without replacing or revealing the existing authenticated-AI key.

`guest_quota_worker` is ready for provisioning but has no persistent password. The approved connection shape is the Supavisor transaction pooler with SSL required, `prepare: false`, and `max: 1`; the worker retains only schema usage and RPC execution. No credential was created during this review.

Expiry is **NONBLOCKING FOR INITIAL BETA**. The RPC rejects a reused expired flow with `flow_expired`, computes network decisions only for the current time bucket, and has indexes on both expiry columns. A later owner-controlled maintenance procedure can delete rows where `expires_at < now()`; no external cleanup service or `pg_cron` job is required before a controlled beta. The deterministic expired-flow test is **SUFFICIENTLY VERIFIED** by the SQL branch, indexed construction, and structural verifier; a privileged live seed is optional rather than a deployment blocker.

Provider protection is sufficient for controlled QA at the application boundary: `gpt-5-mini`, low reasoning effort, 12-second timeout, 500 output tokens, `store: false`, no automatic retries, bounded response validation, and durable quota before provider invocation. Before wider beta, Founder should confirm provider budget alerts, hard spend/rate limits, and an emergency disable procedure. The minimal live QA after deployment is three paid calls total: one each at simplification depths 0, 1, and 2, using synthetic task text.

Exact later deployment order: (1) Founder supplies the production origin; (2) provision the worker password and `GUEST_QUOTA_DB_URL`; (3) provision a cryptographically random HMAC-SHA-256 secret; (4) set `GUEST_AI_NETWORK_SIGNAL_CONFIRMED=true`; (5) set exact production CORS; (6) deploy with `GUEST_AI_ENABLED=false`; (7) verify the disabled response and non-provider invalid/quota paths; (8) enable the flag for controlled QA; (9) run the three-call provider QA and compact Founder product QA; (10) disable immediately on failure; (11) document results; (12) commit and push only after approval.

Before guest-AI deployment approval, run: (1) production Edge secret provisioning; (2) live provider-timeout and response-validation QA without exposing raw output; (3) origin/CORS and kill-switch tests; (4) provider spend/limit confirmation; and (5) Founder product QA. Re-run the gateway probe after any routing or platform change.

Rollback is to disable guest AI (`GUEST_AI_ENABLED` anything other than exact `true`) before any schema or function rollback. If the migration must be reverted, first stop guest traffic, preserve quota evidence, then use a separately reviewed down migration; do not drop the private schema while the function can still receive traffic.

The win screen is the Sprint 12D handoff seam; it does not reveal or build the Den and does not trigger account conversion.

# Security Pass A: Authenticated AI Authorization

Status: PASS — ready for Sprint 12C

## 1. Why Security Pass A existed

The original AI authorization design left both Edge Functions with
`verify_jwt = false`, trusted a client-supplied `userId`, and used
service-role database access keyed by that body value. That combination
created a broken object-level authorization risk: a caller could potentially
request another user's AI context or affect another user's planner data.

Security Pass A removes the body identity as an authorization source and
makes the signed-in Supabase identity authoritative.

## 2. Final architecture

```text
verified JWT
  -> supabase.auth.getUser(token)
  -> JWT-derived callerId
  -> request-scoped Supabase client carrying the caller Authorization header
  -> Row Level Security
  -> caller-owned rows only
```

Both `ai-task-coach` and `daily-ai-planner` have gateway
`verify_jwt = true`. Neither function uses
`SUPABASE_SERVICE_ROLE_KEY`. The server derives `callerId` from the
verified user and uses it for every protected query and write.

## 3. Functions hardened

- `ai-task-coach`
- `daily-ai-planner`

The shared authorization, request validation, context construction, HTTP
error, OpenAI request, and AI response-validation paths are covered by the
Security Pass A verifier and tests.

## 4. Frontend changes

`useAICoach` and `useDailyPlanner` invoke the functions without a body
`userId`. `AuthenticatedApp` now calls the reduced Coach hook contract.
Frontend error logging is coarse and does not print Edge Function error
payloads or arbitrary exception objects.

## 5. Legacy compatibility

The body `userId` field is temporarily tolerated for older clients:

- absent: normal canonical request;
- equal to the verified caller: accepted, ignored for authorization;
- different from the verified caller: rejected before data access with HTTP
  403 and public code `identity_mismatch`.

The field never selects the database identity.

## 6. Context safety

Buddy context uses explicit column lists, checks every query result, and fails
closed if a query fails. Task and habit result sets are bounded to 200 and 100
rows respectively. User-controlled strings are truncated to 500 Unicode code
points. The Supabase user UUID is not included in the OpenAI context.
Pomodoro context is count-only.

## 7. Planner integrity

Planner refresh follows generate, validate, then atomic upsert on
`user_id,plan_date,intensity`. It does not delete the cached plan before
generation. A provider, parsing, or validation failure therefore leaves the
existing cached plan intact. The stored `user_id` always comes from
`callerId`, and RLS remains an additional ownership boundary.

## 8. OpenAI safeguards

Both functions use `gpt-5-mini` through the Responses API with:

- a 30-second `AbortController` timeout;
- `max_output_tokens: 1600`;
- `store: false`;
- server-side Coach or Planner response validation;
- generic, sanitized public errors;
- privacy-safe internal logging limited to `requestId`, an allowlisted
  failure phase, and a valid coarse provider HTTP status when present.

The implementation does not return or log prompts, context, generated output,
raw provider bodies, raw provider messages, credentials, tokens, or arbitrary
exception payloads.

The optional `npm run verify:security-pass-a:provider` developer probe signs
in with environment-provided QA A credentials, makes exactly one canonical
Coach request, and reports only PASS or FAIL. It does not inspect diagnostic
headers or print response content, credentials, tokens, email addresses, or
UUIDs.

## 9. Live QA evidence

Two controlled, distinct QA accounts completed the full live harness.

- no-auth and invalid-auth rejection: PASS for both functions;
- canonical own Coach and Planner access: PASS for both accounts;
- canonical requests without body `userId`: PASS;
- A to B and B to A mismatch rejection: PASS for both functions;
- cross-user data integrity after mismatch attempts: PASS;
- RLS isolation: PASS for `tasks`, `habits`, `user_progress`,
  `pomodoro_sessions`, `user_stats`, and `daily_ai_plans`;
- matching legacy compatibility: PASS for both accounts and functions;
- Planner secured refresh, ownership, and cross-user isolation: PASS;
- frontend no-`userId` contract: PASS;
- disposable-row cleanup: PASS (`user_stats` cleanup was not needed because
  the harness did not create that row).

The credential-free regression harness remains available as
`npm run verify:security-pass-a:live`; it reads QA credentials only from the
environment. The narrower post-deploy path is
`npm run verify:security-pass-a:smoke`.

## 10. Incident discovered during QA

An earlier sanitized HTTP 502 was traced to OpenAI HTTP 429 with the
allowlisted internal category `provider_rate_limit` and provider code
`credit_balance_exhausted`. It was an external API billing-state incident,
not a Zatora authorization, RLS, context-builder, request-contract,
response-extraction, or model defect.

After API credits were replenished, the one-request provider probe returned
HTTP 200. No product security control was weakened to resolve the incident.

## 11. Log privacy verification

The Founder manually inspected live Supabase logs for `ai-task-coach` and
`daily-ai-planner` during the successful QA window. Visible application logs
were limited to coarse request identifiers/codes plus platform lifecycle
events. No JWTs, authorization headers, credentials, emails, full user UUIDs,
task or habit content, Buddy context, prompts, generated output, raw provider
content, API keys, or secrets were visible. Result: PASS.

The Founder preserved these screenshots externally; they are intentionally
not copied into this repository:

- `Sprint Security Pass A/Verification/security-pass-a-daily-planner-logs-clean.png`
- `Sprint Security Pass A/Verification/security-pass-a-ai-task-coach-logs-clean.png`

## 12. Final production cleanup

The temporary public diagnostic response headers used for the 429
investigation were removed before finalization:

- `X-Zatora-AI-Phase`
- `X-Zatora-AI-Provider-Status`
- `X-Zatora-AI-Provider-Category`
- `X-Zatora-AI-Provider-Code`

Clients receive only the established sanitized JSON error contract, such as
HTTP 502 with `code: "ai_provider_failure"`. Safe internal classification
remains for server-side diagnosis.

## 13. Remaining future hardening

The following work is intentionally deferred and is not required to close
Security Pass A:

- establish a complete database migration and security baseline in Git;
- review and revoke unnecessary `anon` grants;
- narrow broad database grants;
- evaluate authenticated-specific policy roles instead of `public`;
- evaluate `(select auth.uid())` policy optimization;
- add useful `user_id` indexes where query plans justify them;
- enable leaked-password protection before public beta;
- add application-level AI rate limiting and quota controls;
- configure provider spend and cost alerts;
- improve the repository-wide lint baseline;
- address Vite chunk-size and performance opportunities.

The verified live database security state is not yet fully represented by the
repository's migration history. Closing that documentation/baseline gap is a
separate future task. No migration, RLS, grant, schema, secret, or Auth
configuration change was made in Security Pass A finalization.

## 14. Final verdict

Security Pass A is PASS and ready for Sprint 12C. Sprint 12C work was not
started as part of this security pass.

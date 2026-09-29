# Zatora Mobile

Minimal Expo Router foundation for the native Zatora client.

## Start locally

```bash
npm install
npm start
```

Use `npm run android`, `npm run ios`, or `npm run web` when the corresponding
local target is available.

Routes live under `src/app/`. The native guest shell now lives under
`src/app/(guest)/` and keeps the M3 flow intentionally provider-free:
Welcome → Name → Support → Handoff → First task → an explicit M4 boundary.
It does not call OpenAI, invoke an Edge Function, or write to Supabase.

The platform-neutral guest domain lives at `../shared/guest/` and is the
authoritative reducer and validation layer for both clients. The native shell
stores only a bounded, expiring draft in AsyncStorage under a native-only key;
Start over clears it.

Native auth reads `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, persists sessions with AsyncStorage,
and pauses or resumes Supabase token refresh with the app lifecycle. Never add
server secrets to Expo variables. OAuth and password-reset deep links remain
deferred until a later auth phase.

Future public client variables use `EXPO_PUBLIC_*` names. Keep OpenAI keys,
quota database credentials, HMAC secrets, and guest-AI server flags in
Supabase Edge Function secrets; never add them here.

## M3 manual QA

Run `npm start`, open the project in Expo Go, and verify the guest flow on a
real device or simulator. Close and reopen during Name, Support, and First task
to confirm the draft restores. Use Start over to confirm it clears. The final
screen is the intentional M4 boundary; no provider request should occur.

The `zatora` scheme and `zatora-mobile` slug are development-safe local
configuration. Final Apple bundle and Android package identifiers remain a
Founder decision before store deployment.

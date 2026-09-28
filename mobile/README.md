# Zatora Mobile

Minimal Expo Router foundation for the native Zatora client.

## Start locally

```bash
npm install
npm start
```

Use `npm run android`, `npm run ios`, or `npm run web` when the corresponding
local target is available.

Routes live under `src/app/`. M0 intentionally contains only the root route and
a small native theme. Authentication, persistence, product screens, and
Supabase integration belong to later migration phases.

The platform-neutral First Win domain lives at `../shared/guest/` and is
consumed by the web reference client; native UI consumption begins in a later
phase.

Future public client variables use `EXPO_PUBLIC_*` names. Keep OpenAI keys,
quota database credentials, HMAC secrets, and guest-AI server flags in
Supabase Edge Function secrets; never add them here.

The `zatora` scheme and `zatora-mobile` slug are development-safe local
configuration. Final Apple bundle and Android package identifiers remain a
Founder decision before store deployment.
